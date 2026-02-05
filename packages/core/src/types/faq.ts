export interface FAQ {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
