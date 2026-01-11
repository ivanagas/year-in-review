'use client';

import { YearInReviewPost } from '../types';

interface PostListProps {
  posts: YearInReviewPost[];
  allPosts: YearInReviewPost[];
  selectedYear: number;
}

interface AuthorGroup {
  author: string;
  currentPost: YearInReviewPost;
  pastPosts: YearInReviewPost[];
  futurePosts: YearInReviewPost[];
  allPosts: YearInReviewPost[];
  streak: number;
}

function calculateStreak(posts: YearInReviewPost[], selectedYear: number): number {
  if (posts.length === 0) return 0;

  const sortedYears = posts.map(p => p.year).sort((a, b) => b - a);

  let streak = 0;
  let expectedYear = selectedYear;

  for (const year of sortedYears) {
    if (year === expectedYear) {
      streak++;
      expectedYear--;
    } else if (year < expectedYear) {
      break;
    }
  }

  return streak;
}

function groupByAuthor(posts: YearInReviewPost[], allPosts: YearInReviewPost[], selectedYear: number): AuthorGroup[] {
  const grouped = posts.reduce((acc, post) => {
    if (!acc[post.author]) {
      acc[post.author] = [];
    }
    acc[post.author].push(post);
    return acc;
  }, {} as Record<string, YearInReviewPost[]>);

  return Object.entries(grouped).map(([author, authorPosts]) => {
    const currentPost = authorPosts[0];

    // Get all posts for this author from allPosts
    const authorAllPosts = allPosts.filter(p => p.author === author);
    const sortedAllPosts = [...authorAllPosts].sort((a, b) => b.year - a.year);

    // Split into past and future based on selected year
    const pastPosts = sortedAllPosts.filter(p => p.year < selectedYear);
    const futurePosts = sortedAllPosts.filter(p => p.year > selectedYear);

    const streak = calculateStreak(authorAllPosts, selectedYear);

    return {
      author,
      currentPost,
      pastPosts,
      futurePosts,
      allPosts: sortedAllPosts,
      streak,
    };
  });
}

export default function PostList({ posts, allPosts, selectedYear }: PostListProps) {
  const authorGroups = groupByAuthor(posts, allPosts, selectedYear);

  const shouldShowYear = (title: string, year: number) => {
    return !title.includes(year.toString());
  };

  return (
    <div className="w-full space-y-6">
      {authorGroups.map((group) => (
        <div
          key={group.author}
          className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              {group.author}
            </h3>
            {group.streak > 1 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                <span>🔥</span>
                <span>{group.streak} year streak</span>
              </span>
            )}
          </div>

          <a
            href={group.currentPost.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-2 text-blue-600 hover:underline text-lg font-medium"
          >
            {group.currentPost.title}
            {shouldShowYear(group.currentPost.title, group.currentPost.year) && (
              <> ({group.currentPost.year})</>
            )}
          </a>

          {group.currentPost.preview && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-3">
              {group.currentPost.preview}
            </p>
          )}

          {group.currentPost.wordCount && (
            <p className="text-xs text-gray-500 mb-4">
              {group.currentPost.wordCount.toLocaleString()} words
            </p>
          )}

          <div className="space-y-3">
            {group.futurePosts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  Future years:
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.futurePosts.map((post) => (
                    <a
                      key={post.id}
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                    >
                      {post.year}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {group.pastPosts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  Past years:
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.pastPosts.map((post) => (
                    <a
                      key={post.id}
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                    >
                      {post.year}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
