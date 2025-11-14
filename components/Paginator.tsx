import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface PaginatorProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  hasMoreResults: boolean;
  isLoading: boolean;
}

const Paginator: React.FC<PaginatorProps> = ({ currentPage, onPageChange, hasMoreResults, isLoading }) => {
  const [pageInput, setPageInput] = useState<string>(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (hasMoreResults) {
      onPageChange(currentPage + 1);
    }
  };
  
  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && pageNum > 0 && pageNum !== currentPage) {
      onPageChange(pageNum);
    } else {
      setPageInput(String(currentPage)); // Reset if invalid or same page
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1 || isLoading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500 transition-colors"
        aria-label="Go to previous page"
      >
        <ChevronLeftIcon className="w-4 h-4" />
        Previous
      </button>

      <form onSubmit={handleGoToPage} className="flex items-center gap-2">
        <label htmlFor="page-input" className="text-sm font-medium text-slate-300">
            Page
        </label>
        <input
            id="page-input"
            type="number"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            disabled={isLoading}
            min="1"
            className="w-16 bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-center text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed"
            aria-label={`Current page, page ${currentPage}`}
        />
        <button 
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500 transition-colors"
        >
            Go
        </button>
      </form>

      <button
        onClick={handleNext}
        disabled={!hasMoreResults || isLoading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500 transition-colors"
        aria-label="Go to next page"
      >
        Next
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Paginator;