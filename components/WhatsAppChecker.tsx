import React, { useState, useRef } from 'react';
import { LinkIcon } from './icons/LinkIcon';
import { checkWhatsAppStatus } from '../services/geminiService';
import type { WhatsAppCheckResult, WhatsAppStatus } from '../types';
import Loader from './Loader';
import { XCircleIcon } from './icons/XCircleIcon';
import Tooltip from './Tooltip';
import { UploadIcon } from './icons/UploadIcon';

// New type for the result rows
interface WhatsAppCheckRow {
  number: string;
  result: WhatsAppCheckResult | null;
  link: string;
  isLoading: boolean;
  error?: string;
}

interface ProgressState {
  current: number;
  total: number;
}


const WhatsAppChecker: React.FC = () => {
  const [phoneNumbers, setPhoneNumbers] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<WhatsAppCheckRow[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState<ProgressState>({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNumbers = e.target.value;
    setPhoneNumbers(newNumbers);
    if (newNumbers.trim() === '') {
        setError('');
        setResults([]);
    }
  };

  const handleClearInput = () => {
    setPhoneNumbers('');
    setError('');
    setResults([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setResults([]);
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
            const lines = text.split('\n');
            const numbers = lines
                .map(line => line.split(',')[0].trim().replace(/[^+\d]/g, ''))
                .filter(num => PHONE_REGEX.test(num));

            if (numbers.length > 0) {
                setPhoneNumbers(numbers.join('\n'));
            } else {
                setError('No valid phone numbers found in the uploaded CSV file. Please ensure it has one column with numbers in international format.');
            }
        }
    };
    reader.onerror = () => {
         setError('Failed to read the uploaded file.');
    };
    reader.readAsText(file);
    
    e.target.value = '';
  };

  const handleCheck = async () => {
    setError('');
    setResults([]);
    setProgress({ current: 0, total: 0 });

    const numbersToCheck = phoneNumbers
        .split('\n')
        .map(n => n.trim().replace(/[\s\(\)-]/g, ''))
        .filter(Boolean);

    if (numbersToCheck.length === 0) {
        setError('Please enter at least one phone number.');
        return;
    }
    
    // Validate all numbers before starting
    const invalidNumbers = numbersToCheck.filter(num => !PHONE_REGEX.test(num));
    if (invalidNumbers.length > 0) {
        setError(`Found invalid numbers: ${invalidNumbers.join(', ')}. Please use international format, e.g., +15551234567`);
        return;
    }

    setIsLoading(true);
    setProgress({ current: 0, total: numbersToCheck.length });

    const initialResults: WhatsAppCheckRow[] = numbersToCheck.map(number => ({
        number,
        result: null,
        link: '',
        isLoading: true,
    }));
    setResults(initialResults);

    // Process each number sequentially to show progress
    for (let i = 0; i < numbersToCheck.length; i++) {
        const number = numbersToCheck[i];
        try {
            const result = await checkWhatsAppStatus(number);
            const digitsOnlyNumber = number.replace(/[^0-9]/g, '');
            const link = `https://wa.me/${digitsOnlyNumber}`;
            
            setResults(prev => prev.map((row, index) => 
                index === i ? { ...row, result, link, isLoading: false } : row
            ));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setResults(prev => prev.map((row, index) => 
                index === i ? { ...row, result: { status: 'Unknown', reason: 'Failed to check' }, error: errorMessage, isLoading: false } : row
            ));
        } finally {
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
    }

    setIsLoading(false);
  };
  
  const handleCopy = (link: string, index: number) => {
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const getStatusBgColor = (status?: WhatsAppStatus) => {
      switch (status) {
          case 'Likely Active':
              return 'bg-green-600';
          case 'Likely Inactive':
              return 'bg-red-600';
          case 'Unknown':
              return 'bg-slate-500';
          default:
              return 'bg-slate-500';
      }
  };

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-4">WhatsApp Account Checker</h2>
      <p className="text-slate-400 mb-6">
        Enter phone numbers (one per line) to check their WhatsApp status and generate chat links.
      </p>

      <div className="flex flex-col gap-4 mb-2">
        <Tooltip text="Paste phone numbers, one per line. Use international format (e.g., +15551234567) for best results.">
            <div className="relative flex-grow">
              <textarea
                value={phoneNumbers}
                onChange={handleInputChange}
                placeholder="e.g., +15551234567&#10;+442071234567&#10;+919876543210"
                rows={5}
                aria-describedby="phone-error"
                className={`w-full bg-slate-900 border rounded-md px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-colors duration-200 resize-y ${
                    error
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-slate-700 focus:ring-blue-500' 
                }`}
              />
              {phoneNumbers && (
                  <button
                      onClick={handleClearInput}
                      className="absolute top-2 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition-colors"
                      aria-label="Clear input"
                  >
                      <XCircleIcon className="w-5 h-5" />
                  </button>
              )}
            </div>
        </Tooltip>
        
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv, text/csv"
            className="hidden"
            aria-label="Upload CSV file"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Tooltip text="Upload a CSV file with a single column of phone numbers.">
                 <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
                >
                    <UploadIcon className="w-5 h-5" />
                    Upload CSV
                </button>
            </Tooltip>
            <button
              onClick={handleCheck}
              disabled={isLoading || !phoneNumbers.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-md transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? <Loader /> : `Check ${phoneNumbers.split('\n').filter(Boolean).length || 0} Number(s)`}
            </button>
        </div>
      </div>

      <div id="phone-error" className="h-5">
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
      
      {isLoading && progress.total > 0 && (
        <div className="my-4">
            <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-slate-300">Overall Progress</span>
                <span className="text-sm font-medium text-slate-400">{progress.current} / {progress.total} Checked</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div 
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${progressPercentage}%` }}
                    role="progressbar"
                    aria-valuenow={progress.current}
                    aria-valuemin={0}
                    aria-valuemax={progress.total}
                    aria-label="WhatsApp check progress"
                ></div>
            </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Phone Number</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">WhatsApp Link</th>
              </tr>
            </thead>
            <tbody className="bg-slate-900 divide-y divide-slate-800">
              {results.map((row, index) => (
                <tr key={index} className="hover:bg-slate-800/50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">{row.number}</td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-slate-300">
                    {row.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader />
                        <span>Checking...</span>
                      </div>
                    ) : row.result ? (
                      <div className="flex flex-col gap-1">
                          <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded-full text-white self-start ${getStatusBgColor(row.result.status)}`}>
                            {row.result.status}
                          </span>
                          <p className="text-slate-400 text-xs">{row.result.reason}</p>
                      </div>
                    ) : null}
                    {row.error && <p className="text-red-400 text-xs">{row.error}</p>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {row.link ? (
                      <div className="flex items-center gap-2">
                        <a 
                          href={row.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-3 rounded-md transition-colors duration-200 flex items-center gap-2 text-xs"
                        >
                          <LinkIcon className="w-3 h-3" />
                          Open
                        </a>
                        <button 
                          onClick={() => handleCopy(row.link, index)}
                          className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-1.5 px-3 rounded-md transition-colors duration-200 w-20 text-center text-xs"
                        >
                          {copiedIndex === index ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    ) : !row.isLoading ? (
                      <span>-</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WhatsAppChecker;