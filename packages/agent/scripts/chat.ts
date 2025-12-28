import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getDb, createMemberRepository } from "@tee-time/database";
import { routeAgentMessage, runOnboardingFlow, runSupportHandoffFlow } from "../src";
import {
  clearBookingState,
  createSupportRequest,
  getBookingState,
  isFlowStateEnvelope,
  saveBookingState,
  wrapFlowState,
} from "@tee-time/core";
import { config } from "@dotenvx/dotenvx";
import path from "node:path";

// Load environment variables from the root .env
config({ path: path.join(__dirname, "../../../.env") });

async function main() {
  const db = getDb();
  const memberRepo = createMemberRepository(db);

  // Simulate a member for testing
  const TEST_PHONE = "+15550001111";
  let member = await memberRepo.getByPhoneNumber(TEST_PHONE);
  if (!member) {
    member = await memberRepo.create({
      phoneNumber: TEST_PHONE,
      name: "Test User",
      membershipId: "TEST-MEM-001",
      timezone: "America/Chicago",
      favoriteLocationLabel: "Topgolf Dallas",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Created test member:", member.id);
  } else {
    console.log("Using existing test member:", member.id);
  }

  const rl = createInterface({ input, output });
  const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> =
    [];

  console.log("\nTee Time Agent CLI");
  console.log("--------------------------------");
  console.log("Type your message and press Enter.");
  console.log("Type 'quit' or 'exit' to end.");
  console.log("--------------------------------\n");

  while (true) {
    const userInput = await rl.question("You: ");
    const message = userInput.trim();

    if (message.toLowerCase() === "quit" || message.toLowerCase() === "exit") {
      break;
    }

    if (!message) continue;

    try {
      const storedState = await getBookingState<Record<string, unknown>>(
        db,
        member.id
      );
      const storedEnvelope =
        storedState && isFlowStateEnvelope(storedState.state)
          ? storedState.state
          : null;

      const decision = await routeAgentMessage({
        message,
        memberId: member.id,
        memberExists: true,
        db, // Pass DB for full functionality
        conversationHistory,
      });

      let finalDecision = decision;
      const saveFlowState = async (
        flow: string,
        state: Record<string, unknown>
      ) => {
        await saveBookingState(db, member.id, wrapFlowState(flow, state));
      };
      const clearFlowState = async () => {
        await clearBookingState(db, member.id);
      };

      if (decision.flow === "onboarding") {
        const result = await runOnboardingFlow({
          message,
          phoneNumber: member.phoneNumber,
          db,
          existingState:
            storedEnvelope?.flow === "onboarding"
              ? (storedEnvelope.data as Parameters<
                  typeof runOnboardingFlow
                >[0]["existingState"])
              : undefined,
        });
        if (result.type === "submitted") {
          await clearFlowState();
          finalDecision = {
            flow: "clarify",
            prompt: `Welcome, ${result.payload.name}! You're all set up. How can I help you book a tee time?`,
          };
        } else if (result.type === "ask" || result.type === "confirm-default") {
          await saveFlowState("onboarding", result.nextState);
          finalDecision = { flow: "clarify", prompt: result.prompt };
        } else if (result.type === "clarify") {
          finalDecision = { flow: "clarify", prompt: result.prompt };
        }
      } else if (decision.flow === "support") {
        const result = await runSupportHandoffFlow({
          message,
          memberId: member.id,
          existingState:
            storedEnvelope?.flow === "support"
              ? (storedEnvelope.data as Parameters<
                  typeof runSupportHandoffFlow
                >[0]["existingState"])
              : undefined,
        });
        if (result.type === "handoff") {
          const summary =
            result.payload.summary ??
            result.payload.reason ??
            "Support request";
          await createSupportRequest(db, {
            memberId: member.id,
            message: summary,
          });
          await clearFlowState();
          finalDecision = {
            flow: "clarify",
            prompt:
              "I've notified our staff about your request. Someone will reach out to you shortly.",
          };
        } else {
          if (result.type === "confirm-handoff") {
            await saveFlowState("support", result.nextState);
          }
          finalDecision = { flow: "clarify", prompt: result.prompt };
        }
      } else if (decision.flow === "cancel-booking") {
        const d = decision.decision;
        if (d.type === "cancelled") {
          await clearFlowState();
        } else if (
          d.type === "lookup" ||
          d.type === "need-booking-info" ||
          d.type === "confirm-cancel"
        ) {
          await saveFlowState("cancel-booking", d.nextState);
        }
      } else if (decision.flow === "booking-status") {
        const d = decision.decision;
        if (d.type === "respond") {
          if (d.offerBooking) {
            await saveFlowState("booking-status", { offerBooking: true });
          } else {
            await clearFlowState();
          }
        } else if (
          d.type === "lookup" ||
          d.type === "need-booking-info" ||
          d.type === "not-found" ||
          d.type === "clarify"
        ) {
          await saveFlowState("booking-status", { pending: true });
        }
      } else if (decision.flow === "modify-booking") {
        const d = decision.decision;
        if (d.type === "update") {
          const payload = d.payload;
          const summaryParts = [
            payload.bookingId ? `Booking ID: ${payload.bookingId}` : null,
            payload.bookingReference
              ? `Reference: ${payload.bookingReference}`
              : null,
            payload.club ? `Club: ${payload.club}` : null,
            payload.clubLocation ? `Location: ${payload.clubLocation}` : null,
            payload.preferredDate ? `Date: ${payload.preferredDate}` : null,
            payload.preferredTime ? `Time: ${payload.preferredTime}` : null,
            payload.players ? `Players: ${payload.players}` : null,
            payload.guestNames ? `Guests: ${payload.guestNames}` : null,
            payload.notes ? `Notes: ${payload.notes}` : null,
          ].filter(Boolean);
          await createSupportRequest(db, {
            memberId: member.id,
            message:
              summaryParts.length > 0
                ? `Modify booking request:\n${summaryParts.join("\n")}`
                : "Modify booking request",
          });
          await clearFlowState();
        } else if (
          d.type === "lookup" ||
          d.type === "need-booking-info" ||
          d.type === "confirm-update"
        ) {
          await saveFlowState("modify-booking", d.nextState);
        }
      }

      let responseText = "";

      // Convert decision to text response (mimicking the webhook logic)
      switch (finalDecision.flow) {
        case "booking-new": {
          const d = finalDecision.decision;
          if (d.type === "ask" || d.type === "ask-alternatives") responseText = d.prompt;
          else if (d.type === "confirm-default") responseText = d.prompt;
          else if (d.type === "review") responseText = d.summary;
          else if (d.type === "submitted") responseText = `[Submitted] ${d.message}`;
          else if (d.type === "submit") responseText = "Processing booking request...";
          else if (d.type === "clarify") responseText = d.prompt;
          break;
        }
        case "booking-status": {
            const d = finalDecision.decision;
            if (d.type === "respond") responseText = d.message;
            else if (d.type === "not-found") responseText = d.prompt;
            else if (d.type === "need-booking-info") responseText = d.prompt;
            else if (d.type === "clarify") responseText = d.prompt;
            else if (d.type === "lookup") responseText = `Checking booking ref: ${d.bookingReference}...`;
            break;
        }
        case "cancel-booking": {
            const d = finalDecision.decision;
            if (d.type === "cancelled") responseText = d.message;
            else if (d.type === "confirm-cancel") responseText = d.prompt;
            else if (d.type === "need-booking-info") responseText = d.prompt;
            else if (d.type === "lookup") responseText = d.prompt ?? "Let me find that booking.";
            else if (d.type === "not-allowed") responseText = d.prompt;
            else if (d.type === "not-found") responseText = d.prompt;
            else if (d.type === "clarify") responseText = d.prompt;
            break;
        }
        case "modify-booking": {
            const d = finalDecision.decision;
            if (d.type === "confirm-update") responseText = d.prompt;
            else if (d.type === "need-booking-info") responseText = d.prompt;
            else if (d.type === "lookup") responseText = d.prompt ?? "Let me find that booking.";
            else if (d.type === "update") responseText = "Got it. I'll send that update request to staff.";
            else if (d.type === "clarify") responseText = d.prompt;
            break;
        }
        case "faq": {
            const d = finalDecision.decision;
            if (d.type === "answer") responseText = d.answer;
            else if (d.type === "escalate") responseText = "Escalating to staff.";
            else responseText = d.prompt;
            break;
        }
        case "support":
             responseText = "Connecting you to support...";
             break;
        case "clarify":
             responseText = finalDecision.prompt;
             break;
        default:
             responseText = "I'm not sure how to handle that yet.";
      }
      
      console.log(`Agent: ${responseText}\n`);
      conversationHistory.push({ role: "user", content: message });
      conversationHistory.push({ role: "assistant", content: responseText });
      if (conversationHistory.length > 10) {
        conversationHistory.splice(0, conversationHistory.length - 10);
      }

    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  rl.close();
  process.exit(0);
}

main().catch(console.error);
