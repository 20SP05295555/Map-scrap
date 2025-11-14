import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScrapeResult, UserLocation, GroundingChunk, Business } from '../types';
import { fetchBusinessData } from '../services/geminiService';
import Loader from './Loader';
import { ResultsTable } from './ResultsTable';
import { DownloadIcon } from './icons/DownloadIcon';
import { BrainCircuitIcon } from './icons/BrainCircuitIcon';
import { BUSINESS_CATEGORIES, COUNTRIES, CITIES_BY_COUNTRY } from '../data/locations';
import Tooltip from './Tooltip';
import Paginator from './Paginator';
import { BusinessDetailCard } from './BusinessDetailCard';

const PAGE_SIZE = 100;

const SourceLink: React.FC<{ source: GroundingChunk, index: number }> = ({ source, index }) => {
    const uri = source.maps?.uri || source.web?.uri;
    const title = source.maps?.title || source.web?.title || `Source ${index + 1}`;
    
    if (!uri) return null;

    return (
        <a href={uri} target="_blank" rel="noopener noreferrer" className="inline-block bg-slate-700 hover:bg-slate-600 text-blue-300 text-xs font-medium mr-2 mb-2 px-2.5 py-1.5 rounded-full transition-colors duration-200">
            {title}
        </a>
    );
};

export const MapsScraper: React.FC = () => {
    // State for Fast Mode
    const [selectedCategory, setSelectedCategory] = useState<string>('Restaurants');
    const [customCategory, setCustomCategory] = useState<string>('');
    const [locationType, setLocationType] = useState<'near_me' | 'specific'>('specific');
    const [radius, setRadius] = useState<string>('1');

    // State for Deep Dive Mode
    const [businessName, setBusinessName] = useState<string>('');

    // Shared State
    const [selectedCountry, setSelectedCountry] = useState<string>('US');
    const [cities, setCities] = useState<string[]>(CITIES_BY_COUNTRY['US'] || []);
    const [city, setCity] = useState<string>('New York');
    const [isDeepDive, setIsDeepDive] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isPaginating, setIsPaginating] = useState<boolean>(false);
    const [isBulkScraping, setIsBulkScraping] = useState<boolean>(false);
    const [result, setResult] = useState<ScrapeResult | null>(null);
    const [error, setError] = useState<string>('');
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [locationStatus, setLocationStatus] = useState<string>('Fetching location...');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [hasMoreResults, setHasMoreResults] = useState<boolean>(false);
    const [currentQuery, setCurrentQuery] = useState<string>('');

    // Filter State
    const [ratingFilter, setRatingFilter] = useState<string>('any');
    const [minReviewsFilter, setMinReviewsFilter] = useState<string>('');

    // Bulk Scrape Progress State
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, cityName: '', totalFound: 0 });

    const getLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                    setLocationStatus('Location acquired successfully.');
                },
                () => {
                    setLocationStatus(`Location access denied. Using a generalized search.`);
                    setError('Could not get location. Results may be less accurate.');
                }
            );
        } else {
            setLocationStatus('Geolocation is not supported by your browser.');
            setError('Geolocation not supported.');
        }
    }, []);

    useEffect(() => {
        getLocation();
    }, [getLocation]);

    useEffect(() => {
        const countryCities = CITIES_BY_COUNTRY[selectedCountry] || [];
        setCities(countryCities);
        if (countryCities.length > 0) {
            setCity(countryCities[0]);
        } else {
            setCity(''); 
        }
    }, [selectedCountry]);
    
    // Reset filters when mode changes or new search is initiated
    useEffect(() => {
        setRatingFilter('any');
        setMinReviewsFilter('');
    }, [isDeepDive]);

    const startBulkScrape = async () => {
        const finalCategory = selectedCategory === 'Other' ? customCategory : selectedCategory;
        if (!finalCategory.trim()) {
            setError('Please enter or select a business category for the bulk scrape.');
            return;
        }

        const citiesToScrape = CITIES_BY_COUNTRY[selectedCountry] || [];
        if (citiesToScrape.length === 0) {
            setError('No cities available for bulk scraping in the selected country.');
            return;
        }

        setIsBulkScraping(true);
        setIsLoading(true);
        setError('');
        setResult({ text: '', sources: [], businesses: [] }); // Start with an empty result set
        setBulkProgress({ current: 0, total: citiesToScrape.length, cityName: '', totalFound: 0 });

        const countryName = COUNTRIES.find(c => c.code === selectedCountry)?.name || selectedCountry;
        let cumulativeBusinesses: Business[] = [];
        let cumulativeSources: GroundingChunk[] = [];

        for (let i = 0; i < citiesToScrape.length; i++) {
            const currentCity = citiesToScrape[i];
            setBulkProgress(prev => ({ ...prev, current: i + 1, cityName: currentCity }));
            
            try {
                const combinedQuery = `${finalCategory} in ${currentCity}, ${countryName}`;
                const apiResult = await fetchBusinessData(combinedQuery, null, false, 1);
                
                if (apiResult.businesses) {
                    cumulativeBusinesses = [...cumulativeBusinesses, ...apiResult.businesses];
                }
                if (apiResult.sources) {
                    // Avoid duplicate sources
                    apiResult.sources.forEach(source => {
                        if (!cumulativeSources.some(cs => (cs.maps?.uri === source.maps?.uri) || (cs.web?.uri === source.web?.uri))) {
                            cumulativeSources.push(source);
                        }
                    });
                }
                
                setResult({ text: '', businesses: cumulativeBusinesses, sources: cumulativeSources });
                setBulkProgress(prev => ({ ...prev, totalFound: cumulativeBusinesses.length }));

                await new Promise(resolve => setTimeout(resolve, 300)); // Short delay between requests

            } catch (err) {
                // Log error for the specific city and continue
                console.error(`Error scraping ${currentCity}:`, err);
                // Optionally show a non-blocking error to the user
            }
        }

        setIsBulkScraping(false);
        setIsLoading(false);
    };

    const handleScrape = async (page = 1) => {
        if (city === 'ALL_CITIES' && !isDeepDive) {
            startBulkScrape();
            return;
        }

        let combinedQuery: string;
        let locationForApi: UserLocation | null = null;
        const countryName = COUNTRIES.find(c => c.code === selectedCountry)?.name || selectedCountry;
        
        if (isDeepDive) {
            if (!businessName.trim()) {
                setError('Please enter a business name for the deep dive.');
                return;
            }
             if (!city || !city.trim() || city === 'ALL_CITIES') {
                setError('Please select a specific city or region for the business location.');
                return;
            }
            combinedQuery = `${businessName} in ${city}, ${countryName}`;
            locationForApi = null;
        } else {
             const finalCategory = selectedCategory === 'Other' ? customCategory : selectedCategory;

            if (!finalCategory.trim()) {
                setError('Please enter or select a business category.');
                return;
            }
            
            if (page === 1) { 
                if (locationType === 'near_me') {
                    if (!userLocation) {
                        setError('Cannot search "near me" without location access. Please grant permission or choose a specific location.');
                        return;
                    }
                    if (!radius.trim() || isNaN(Number(radius)) || Number(radius) <= 0) {
                        setError('Please enter a valid search radius.');
                        return;
                    }
                    combinedQuery = `${finalCategory} within a ${radius} mile radius of my current location`;
                    locationForApi = userLocation;
                } else {
                    if (!city || !city.trim() || city === 'ALL_CITIES') {
                        setError('Please select a specific city or region.');
                        return;
                    }
                    combinedQuery = `${finalCategory} in ${city}, ${countryName}`;
                    locationForApi = null;
                }
                setCurrentQuery(combinedQuery);
            } else {
                combinedQuery = currentQuery;
                locationForApi = locationType === 'near_me' ? userLocation : null;
            }
        }

        if (page === 1) {
            setResult(null);
            setHasMoreResults(false);
            setRatingFilter('any');
            setMinReviewsFilter('');
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            const apiResult = await fetchBusinessData(combinedQuery, locationForApi, isDeepDive, page);
            
            setResult(apiResult);
            setCurrentPage(page);

            if (!isDeepDive) {
                 setHasMoreResults((apiResult.businesses?.length || 0) >= PAGE_SIZE);
            }

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unexpected error occurred. Please try again.");
            }
        } finally {
            setIsLoading(false);
            setIsPaginating(false);
        }
    };
    
    const handleNewScrape = () => {
        setIsPaginating(false);
        handleScrape(1);
    };

    const handlePageChange = (page: number) => {
        setIsPaginating(true);
        handleScrape(page);
    };

    const filteredBusinesses = useMemo(() => {
        if (!result?.businesses || isDeepDive) return result?.businesses || [];

        let businesses = [...result.businesses];

        if (ratingFilter !== 'any') {
            const minRating = parseFloat(ratingFilter);
            businesses = businesses.filter(b => b.rating != null && b.rating >= minRating);
        }

        if (minReviewsFilter) {
            const minReviews = parseInt(minReviewsFilter, 10);
            if (!isNaN(minReviews)) {
                businesses = businesses.filter(b => {
                    if (b.reviewCount == null) return false;
                    const reviewNum = parseInt(String(b.reviewCount).replace(/[^0-9]/g, ''), 10);
                    return !isNaN(reviewNum) && reviewNum >= minReviews;
                });
            }
        }

        return businesses;
    }, [result, isDeepDive, ratingFilter, minReviewsFilter]);


    const handleDownloadCSV = () => {
        if (!filteredBusinesses || filteredBusinesses.length === 0) return;

        const headers = ['Name', 'Address', 'Phone', 'Description', 'Rating', 'Review Count', 'Category', 'Website', 'Recent Review Reply', 'Owner Name', 'Owner Social Media', 'Company Social Media'];
        const csvRows = [headers.join(',')];

        const escapeCSV = (field: any) => {
            if (field === null || field === undefined) return '""';
            const str = String(field);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return `"${str}"`;
        };
        
        filteredBusinesses.forEach(business => {
            const row = [
                escapeCSV(business.name),
                escapeCSV(business.address),
                escapeCSV(business.phone),
                escapeCSV(business.description),
                escapeCSV(business.rating),
                escapeCSV(business.reviewCount),
                escapeCSV(business.category),
                escapeCSV(business.website),
                escapeCSV(business.recentReviewReplyDate),
                escapeCSV(business.ownerName),
                escapeCSV(business.ownerSocialMedia?.join('; ')),
                escapeCSV(business.companySocialMedia?.join('; ')),
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'business_data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isScrapeButtonDisabled = isLoading || (isDeepDive ? !businessName.trim() : !(selectedCategory === 'Other' ? customCategory.trim() : selectedCategory.trim()));
    const countryName = COUNTRIES.find(c => c.code === selectedCountry)?.name || selectedCountry;
    const isAllCities = city === 'ALL_CITIES' && !isDeepDive;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Google Maps Scraper</h2>
                <Tooltip text="Deep Dive uses advanced reasoning for complex queries (slower, more detailed). Fast mode uses Maps for quick results.">
                    <div className="flex items-center gap-2 cursor-pointer">
                        <span className={`text-sm font-medium ${isDeepDive ? 'text-slate-400' : 'text-white'}`}>
                            Fast
                        </span>
                        <button
                            onClick={() => setIsDeepDive(!isDeepDive)}
                            disabled={isBulkScraping}
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed ${isDeepDive ? 'bg-purple-600 focus:ring-purple-500' : 'bg-blue-600 focus:ring-blue-500'}`}
                        >
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${isDeepDive ? 'translate-x-6' : 'translate-x-1'}`}>
                                {isDeepDive && <BrainCircuitIcon className="w-4 h-4 text-purple-600 p-0.5" />}
                            </span>
                        </button>
                        <span className={`text-sm font-medium ${isDeepDive ? 'text-white' : 'text-slate-400'}`}>
                            Deep Dive
                        </span>
                    </div>
                </Tooltip>
            </div>
            <p className="text-slate-400 mb-2">
                {isDeepDive
                    ? 'Get a comprehensive intelligence report on a single business.'
                    : 'Scrape lists of businesses from Maps using a category and location.'}
            </p>
            <p className="text-xs text-slate-500 mb-6">{locationStatus}</p>

            <div className="space-y-4">
                {isDeepDive ? (
                    <div>
                        <label htmlFor="business-name" className="block text-sm font-medium text-slate-300 mb-2">Business Name</label>
                        <Tooltip text="Enter the full name of the business you want to investigate.">
                            <input
                                id="business-name"
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="e.g., Joe's Pizza"
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </Tooltip>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="category-select" className="block text-sm font-medium text-slate-300 mb-2">Business Category</label>
                            <Tooltip text="Select a business category to search for, or choose 'Other' to type your own." className="block">
                                <select
                                    id="category-select"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    disabled={isBulkScraping}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-700"
                                >
                                    {BUSINESS_CATEGORIES.map(group => (
                                        <optgroup key={group.group} label={group.group}>
                                            {group.items.map(item => <option key={item} value={item}>{item}</option>)}
                                        </optgroup>
                                    ))}
                                    <option value="Other">Other</option>
                                </select>
                            </Tooltip>
                        </div>
                        {selectedCategory === 'Other' && (
                            <div>
                                <label htmlFor="custom-category" className="block text-sm font-medium text-slate-300 mb-2">Custom Category</label>
                                <input
                                    id="custom-category"
                                    type="text"
                                    value={customCategory}
                                    onChange={(e) => setCustomCategory(e.target.value)}
                                    placeholder="e.g., Vegan bakeries"
                                    disabled={isBulkScraping}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-700"
                                />
                            </div>
                        )}
                    </div>
                )}


                <div>
                     <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                     <div className="bg-slate-900 border border-slate-700 rounded-md p-4 space-y-4">
                        {!isDeepDive && (
                            <div className="flex items-center gap-6">
                                <div className="flex items-center">
                                    <input id="loc-specific" type="radio" name="locationType" value="specific" checked={locationType === 'specific'} onChange={() => setLocationType('specific')} disabled={isBulkScraping} className="h-4 w-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500" />
                                    <label htmlFor="loc-specific" className="ml-2 block text-sm font-medium text-slate-300">Specific Location</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="loc-near-me" type="radio" name="locationType" value="near_me" checked={locationType === 'near_me'} onChange={() => setLocationType('near_me')} disabled={isBulkScraping} className="h-4 w-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500" />
                                    <label htmlFor="loc-near-me" className="ml-2 block text-sm font-medium text-slate-300">Near Me</label>
                                </div>
                            </div>
                        )}

                        {(locationType === 'specific' || isDeepDive) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="country" className="block text-xs font-medium text-slate-400 mb-1">Country</label>
                                    <select
                                        id="country"
                                        value={selectedCountry}
                                        onChange={(e) => setSelectedCountry(e.target.value)}
                                        disabled={isBulkScraping}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-700"
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
                                        disabled={cities.length === 0 || isBulkScraping}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed"
                                    >
                                        {!isDeepDive && <option value="ALL_CITIES">All Cities in {countryName}</option>}
                                        {cities.length > 0 ? (
                                            cities.map(cityName => <option key={cityName} value={cityName}>{cityName}</option>)
                                        ) : (
                                            <option value="">No cities available</option>
                                        )}
                                    </select>
                                </div>
                            </div>
                        ) : (
                             <div className="flex items-center gap-4">
                                <label htmlFor="radius" className="text-sm font-medium text-slate-300">Radius:</label>
                                <Tooltip text="Enter the search radius in miles from your current location.">
                                    <input
                                        id="radius"
                                        type="number"
                                        value={radius}
                                        onChange={(e) => setRadius(e.target.value)}
                                        min="1"
                                        disabled={isBulkScraping}
                                        className="w-24 bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-700"
                                    />
                                </Tooltip>
                                <span className="text-sm text-slate-400">miles</span>
                            </div>
                        )}
                     </div>
                </div>

                <button
                    onClick={handleNewScrape}
                    disabled={isScrapeButtonDisabled}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-md transition-colors duration-200 flex items-center justify-center"
                >
                    {isLoading && !isPaginating && !isBulkScraping ? <Loader /> : (isDeepDive ? 'Deep Scrape Business' : (isAllCities ? `Bulk Scrape ${countryName}` : 'Scrape Business Data'))}
                </button>
            </div>

            {error && <p className="text-red-400 bg-red-900/20 border border-red-500/50 rounded-md p-3 text-sm mt-4">{error}</p>}
            
            {isBulkScraping && (
                 <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="flex justify-between mb-2 text-sm">
                        <span className="font-medium text-slate-200">
                            Bulk Scrape: <span className="font-bold">{bulkProgress.cityName}</span>
                        </span>
                        <span className="text-slate-400">{bulkProgress.current} / {bulkProgress.total} cities</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5">
                        <div 
                            className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-linear" 
                            style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                        ></div>
                    </div>
                    <p className="text-center text-sm text-slate-300 mt-2">
                        Found <span className="font-bold text-white">{bulkProgress.totalFound.toLocaleString()}</span> businesses so far...
                    </p>
                </div>
            )}
            
            {isLoading && !result && !isBulkScraping && (
                <div className="mt-8 space-y-3">
                    <p className="text-center text-sm text-slate-300">
                      {isDeepDive ? 'Performing deep analysis... this may take a moment.' : 'Scraping data from Google Maps...'}
                    </p>
                    <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-blue-500 h-2.5 rounded-full w-1/3 animate-slide"></div>
                    </div>
                </div>
            )}

            {result && (
                <div className="mt-8 bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Results</h3>
                        {filteredBusinesses && filteredBusinesses.length > 0 && (
                            <button onClick={handleDownloadCSV} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200 flex items-center gap-2 text-sm">
                                <DownloadIcon className="w-4 h-4" />
                                Download as CSV
                            </button>
                        )}
                    </div>
                    
                    {isDeepDive ? (
                        result.businesses && result.businesses.length > 0
                            ? <BusinessDetailCard business={result.businesses[0]} />
                            : <p className="text-slate-300">{result.text || "No business found for your query."}</p>
                    ) : (
                       <>
                            {result.businesses && result.businesses.length > 0 && (
                                <div className="mb-4 p-4 bg-slate-800/50 rounded-md border border-slate-700">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-1">
                                            <label htmlFor="rating-filter" className="block text-sm font-medium text-slate-300 mb-2">Minimum Rating</label>
                                            <select
                                                id="rating-filter"
                                                value={ratingFilter}
                                                onChange={(e) => setRatingFilter(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="any">Any Rating</option>
                                                <option value="4.5">4.5 Stars & Up</option>
                                                <option value="4.0">4.0 Stars & Up</option>
                                                <option value="3.5">3.5 Stars & Up</option>
                                                <option value="3.0">3.0 Stars & Up</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label htmlFor="reviews-filter" className="block text-sm font-medium text-slate-300 mb-2">Minimum Reviews</label>
                                            <input
                                                id="reviews-filter"
                                                type="number"
                                                value={minReviewsFilter}
                                                onChange={(e) => setMinReviewsFilter(e.target.value)}
                                                placeholder="e.g., 50"
                                                className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="md:col-span-1 flex items-end justify-end">
                                            <p className="text-sm text-slate-400">
                                                Showing <span className="font-bold text-white">{filteredBusinesses.length}</span> of {result.businesses.length} results.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(filteredBusinesses && filteredBusinesses.length > 0)
                                ? <ResultsTable businesses={filteredBusinesses} />
                                : <div className="text-slate-300 whitespace-pre-wrap font-sans leading-relaxed text-center py-8">{result.text || "No businesses found for your query or that match your filters."}</div>
                            }
                       </>
                    )}


                    {result.sources && result.sources.length > 0 && (
                        <div className="mt-6 border-t border-slate-700 pt-4">
                            <h4 className="text-lg font-semibold mb-3">Sources:</h4>
                            <div>
                                {result.sources.map((source, index) => (
                                    <SourceLink key={index} source={source} index={index} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!isDeepDive && !isBulkScraping && result && result.businesses && result.businesses.length > 0 && (currentPage > 1 || hasMoreResults) && (
                 <Paginator 
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    hasMoreResults={hasMoreResults}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
};