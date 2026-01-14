'use client';

import { useState, useMemo, useEffect } from 'react';
import YearFilter from './components/YearFilter';
import PostList from './components/PostList';
import { posts } from './data';
import { YearInReviewPost } from './types';

type SortOption = 'author' | 'streak' | 'wordCount' | 'oneYearWonder';

export default function Home() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [sortBy, setSortBy] = useState<SortOption>('author');

  const years = useMemo(() => {
    const uniqueYears = [...new Set(posts.map(post => post.year))];
    return uniqueYears.sort((a, b) => b - a);
  }, []);

  // Read hash on mount and set initial year
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const year = parseInt(hash, 10);
    if (!isNaN(year) && years.includes(year)) {
      setSelectedYear(year);
    }
  }, [years]);

  // Update hash when year changes
  useEffect(() => {
    window.history.replaceState(null, '', `#${selectedYear}`);
  }, [selectedYear]);

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const year = parseInt(hash, 10);
      if (!isNaN(year) && years.includes(year)) {
        setSelectedYear(year);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [years]);

  const calculateStreak = (author: string, upToYear: number): number => {
    const authorPosts = posts.filter(p => p.author === author);
    const sortedYears = authorPosts.map(p => p.year).sort((a, b) => b - a);

    let streak = 0;
    let expectedYear = upToYear;

    for (const year of sortedYears) {
      if (year === expectedYear) {
        streak++;
        expectedYear--;
      } else if (year < expectedYear) {
        break;
      }
    }

    return streak;
  };

  // Authors who have only ever posted one year-in-review
  const oneYearWonders = useMemo(() => {
    const authorPostCounts = new Map<string, number>();
    for (const post of posts) {
      authorPostCounts.set(post.author, (authorPostCounts.get(post.author) || 0) + 1);
    }
    return new Set([...authorPostCounts.entries()].filter(([_, count]) => count === 1).map(([author]) => author));
  }, []);

  const filteredAndSortedPosts = useMemo(() => {
    let filtered = posts.filter(post => post.year === selectedYear);

    if (sortBy === 'oneYearWonder') {
      filtered = filtered.filter(post => oneYearWonders.has(post.author));
      return [...filtered].sort((a, b) => a.author.localeCompare(b.author));
    }

    if (sortBy === 'streak') {
      return [...filtered].sort((a, b) => {
        const streakA = calculateStreak(a.author, selectedYear);
        const streakB = calculateStreak(b.author, selectedYear);
        return streakB - streakA;
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'author':
          return a.author.localeCompare(b.author);
        case 'wordCount':
          // Sort by word count descending, with posts without word count at the end
          const countA = a.wordCount ?? 0;
          const countB = b.wordCount ?? 0;
          return countB - countA;
        default:
          return 0;
      }
    });

    return sorted;
  }, [selectedYear, sortBy, oneYearWonders]);

  const stats = useMemo(() => {
    const uniqueAuthors = [...new Set(posts.map(p => p.author))];

    // Calculate longest streak for each author
    const latestYear = Math.max(...posts.map(p => p.year));
    const authorStreaks = uniqueAuthors.map(author => ({
      author,
      streak: calculateStreak(author, latestYear)
    }));
    const longestStreak = Math.max(...authorStreaks.map(a => a.streak));
    const longestStreakAuthors = authorStreaks
      .filter(a => a.streak === longestStreak)
      .map(a => a.author);

    // Calculate most prolific authors
    const authorPostCounts = uniqueAuthors.map(author => ({
      author,
      count: posts.filter(p => p.author === author).length
    }));
    const maxPosts = Math.max(...authorPostCounts.map(a => a.count));
    const mostProlificAuthors = authorPostCounts
      .filter(a => a.count === maxPosts)
      .map(a => a.author);

    return {
      totalPosts: posts.length,
      uniqueAuthors: uniqueAuthors.length,
      longestStreak,
      longestStreakAuthors,
      mostProlificAuthors,
      maxPosts
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Year in Review Review
          </h1>
          <p className="text-gray-600">
            A collection of year-in-review posts from around the web
          </p>
        </header>

        <div className="mb-6">
          <YearFilter
            years={years}
            selectedYear={selectedYear}
            onYearSelect={setSelectedYear}
          />
        </div>

        <div className="mb-6 flex flex-wrap justify-between items-center gap-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="author">Author</option>
                <option value="streak">Streak</option>
                <option value="wordCount">Word Count</option>
                <option value="oneYearWonder">One Year Wonder</option>
              </select>
            </div>

            <div className="text-sm text-gray-600 flex items-center">
              Showing {filteredAndSortedPosts.length} {filteredAndSortedPosts.length === 1 ? 'post' : 'posts'}
            </div>
          </div>

          <button
            onClick={() => {
              if (filteredAndSortedPosts.length > 0) {
                const randomPost = filteredAndSortedPosts[Math.floor(Math.random() * filteredAndSortedPosts.length)];
                window.open(randomPost.url, '_blank');
              }
            }}
            disabled={filteredAndSortedPosts.length === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Random Post
          </button>
        </div>

        <PostList
          posts={filteredAndSortedPosts}
          allPosts={posts}
          selectedYear={selectedYear}
        />

        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Overall Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {stats.totalPosts}
              </div>
              <div className="text-sm font-medium text-gray-600">
                Total Posts
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {stats.uniqueAuthors}
              </div>
              <div className="text-sm font-medium text-gray-600">
                Unique Authors
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {stats.longestStreak}
              </div>
              <div className="text-sm font-medium text-gray-600 mb-2">
                Longest Current Streak
              </div>
              <div className="text-xs text-gray-500">
                {stats.longestStreakAuthors.join(', ')}
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {stats.maxPosts}
              </div>
              <div className="text-sm font-medium text-gray-600 mb-2">
                Most Prolific
              </div>
              <div className="text-xs text-gray-500">
                {stats.mostProlificAuthors.join(', ')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
