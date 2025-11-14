import React, { useState, useEffect } from 'react';
import { RankingResult } from '../types';
import { checkBusinessRanking } from '../services/geminiService';
import Loader from './Loader';
import { COUNTRIES, CITIES_BY_COUNTRY } from '../data/locations';
import Tooltip from './Tooltip';

export const RankingChecker: React.FC = () => {
    const [businessName, setBusinessName] = useState<string>('');
    const [websitePhone, setWebsitePhone] = useState<string>('');
    const [keyword, setKeyword] = useState<string>('');
    const [selectedCountry, setSelectedCountry] = useState<string>('US');
    const [cities, setCities] = useState<string[]>(CITIES_BY_COUNTRY['US'] || []);
    const [city, setCity] = useState<string>('New York');

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [result, setResult] = useState<RankingResult | null>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const countryCities = CITIES_BY_COUNTRY[selectedCountry] || [];
        setCities(countryCities);
        if (countryCities.length > 0) {
            setCity(countryCities[0]);
        } else {
            setCity('');
        }
    }, [selectedCountry]);

    const handleCheckRanking = async () => {
        if (!businessName.trim() || !city.trim()) {
            setError('Please fill in Business Name and Location.');
            return;
        }

        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const countryName = COUNTRIES.find(c => c.code === selectedCountry)?.name || selectedCountry;
            const locationString = `${city}, ${countryName}`;
            const apiResult = await checkBusinessRanking(businessName, websitePhone, keyword, locationString);
            setResult(apiResult);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unexpected error occurred. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const isButtonDisabled = isLoading || !businessName.trim() || !city.trim();

    const getRankColor = (rank: string) => {
        const rankNum = parseInt(rank, 10);
        if (!isNaN(rankNum)) {
            if (rankNum <= 10) return 'text-green-400';
            if (rankNum <= 20) return 'text-yellow-400';
        }
        return 'text-slate-300'; // for >20 or strings like ">50"
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-white">Local Rank Checker</h2>
            <p className="text-slate-400 mt-2 mb-6">
                Check your business's Google Maps ranking for a specific keyword and location.
            </p>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="business-name" className="block text-sm font-medium text-slate-300 mb-2">Business Name</label>
                        <input
                            id="business-name"
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="e.g., Joe's Pizza"
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="website-phone" className="block text-sm font-medium text-slate-300 mb-2">Website or Phone (Optional)</label>
                        <Tooltip text="Providing a website or phone number helps identify the correct business.">
                            <input
                                id="website-phone"
                                type="text"
                                value={websitePhone}
                                onChange={(e) => setWebsitePhone(e.target.value)}
                                placeholder="e.g., joespizza.com or +15551234567"
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </Tooltip>
                    </div>
                </div>
                <div>
                    <label htmlFor="keyword" className="block text-sm font-medium text-slate-300 mb-2">Search Keyword (Optional)</label>
                     <Tooltip text="Enter a keyword to check a specific rank, or leave blank to discover top ranking keywords.">
                        <input
                            id="keyword"
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="e.g., best pizza near me"
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </Tooltip>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="country" className="block text-xs font-medium text-slate-400 mb-1">Country</label>
                            <select
                                id="country"
                                value={selectedCountry}
                                onChange={(e) => setSelectedCountry(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {COUNTRIES.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="city" className="block text-xs font-medium text-slate-400 mb-1">City / Region</label>
                            <select
                                id="city"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                disabled={cities.length === 0}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed"
                            >
                                {cities.length > 0 ? (
                                    cities.map(cityName => <option key={cityName} value={cityName}>{cityName}</option>)
                                ) : (
                                    <option value="">No cities available</option>
                                )}
                            </select>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleCheckRanking}
                    disabled={isButtonDisabled}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-md transition-colors duration-200 flex items-center justify-center"
                >
                    {isLoading ? <Loader /> : 'Check Ranking'}
                </button>
            </div>

            {error && <p className="text-red-400 bg-red-900/20 border border-red-500/50 rounded-md p-3 text-sm mt-4">{error}</p>}

            {isLoading && !result && (
                <div className="mt-8 text-center">
                    <p className="text-slate-300">
                      {keyword.trim() ? 'Analyzing Google Maps results and generating screenshot...' : 'Discovering ranking keywords...'}
                    </p>
                    <p className="text-sm text-slate-400">This may take a moment.</p>
                </div>
            )}

            {result && (
                <div className="mt-8 bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Ranking Result</h3>

                    {/* View for single keyword rank check */}
                    {result.rank && (
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="flex-shrink-0">
                                <p className="text-slate-300">Your rank for "{keyword}":</p>
                                <p className={`text-5xl font-bold ${result.rank === 'Not Found' || result.rank === 'Not Provided' ? 'text-red-400' : 'text-green-400'}`}>
                                    {result.rank === 'Not Found' || result.rank === 'Not Provided' ? result.rank : `#${result.rank}`}
                                </p>
                            </div>
                            <div className="flex-grow w-full">
                                <h4 className="text-lg font-semibold mb-2 text-slate-200">Result Screenshot</h4>
                                {result.imageUrl ? (
                                    <a href={result.imageUrl} target="_blank" rel="noopener noreferrer" title="Click to view full size">
                                        <img 
                                            src={result.imageUrl} 
                                            alt="Google Maps search results screenshot" 
                                            className="rounded-md border-2 border-slate-600 w-full object-contain hover:border-blue-500 transition-colors" 
                                        />
                                    </a>
                                ) : (
                                    <p className="text-slate-400">No screenshot was generated.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* View for discovered keyword ranks */}
                    {result.discoveredRanks && (
                         <div className={result.rank && result.discoveredRanks.length > 0 ? "mt-8 border-t border-slate-700 pt-6" : ""}>
                            {result.discoveredRanks.length > 0 ? (
                            <>
                                <h4 className="text-lg font-semibold mb-4 text-slate-200">
                                    {result.rank ? 'Related Ranking Keywords' : `Found ranking keywords for "${businessName}":`}
                                </h4>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-700">
                                        <thead className="bg-slate-800">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Keyword</th>
                                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">Rank</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-slate-900 divide-y divide-slate-800">
                                            {result.discoveredRanks.map((item, index) => (
                                                <tr key={index} className="hover:bg-slate-800/50 transition-colors duration-200">
                                                    <td className="px-6 py-4 whitespace-normal text-sm font-medium text-white">{item.keyword}</td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-center font-bold ${getRankColor(item.rank)}`}>
                                                        {/^\d+$/.test(item.rank) ? `#${item.rank}` : item.rank}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                            ) : (
                                !result.rank && <p className="text-slate-400">Could not find any ranking keywords for this business in the specified location.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};