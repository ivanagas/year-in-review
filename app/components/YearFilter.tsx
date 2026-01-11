'use client';

interface YearFilterProps {
  years: number[];
  selectedYear: number;
  onYearSelect: (year: number) => void;
}

export default function YearFilter({ years, selectedYear, onYearSelect }: YearFilterProps) {
  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max px-4">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => onYearSelect(year)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              selectedYear === year
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}
