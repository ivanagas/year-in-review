export interface YearInReviewPost {
  id: string;
  url: string;
  year: number;
  author: string;
  title: string;
  preview?: string;
  wordCount?: number;
}

export interface Author {
  name: string;
  posts: YearInReviewPost[];
  currentYearPost?: YearInReviewPost;
  streak: number;
}
