import React from 'react';
import { Business } from '../types';
import { StarIcon } from './icons/StarIcon';

interface ResultsTableProps {
  businesses: Business[];
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ businesses }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-800">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
              Address
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
              Phone
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
              Description
            </th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
              Rating
            </th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
              Reviews
            </th>
          </tr>
        </thead>
        <tbody className="bg-slate-900 divide-y divide-slate-800">
          {businesses.map((business, index) => (
            <tr key={index} className="hover:bg-slate-800/50 transition-colors duration-200">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{business.name || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-normal text-sm text-slate-300">{business.address || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{business.phone || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-normal text-sm text-slate-400">{business.description || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 text-center">
                {business.rating != null ? (
                    <div className="flex items-center justify-center gap-1">
                        <StarIcon className="w-4 h-4 text-yellow-400" />
                        <span>{business.rating.toFixed(1)}</span>
                    </div>
                ) : 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 text-center">{business.reviewCount != null ? business.reviewCount.toLocaleString() : 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};