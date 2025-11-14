import React from 'react';
import { Business } from '../types';
import { MapPinIcon } from './icons/MapPinIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { WebsiteIcon } from './icons/WebsiteIcon';
import { UserIcon } from './icons/UserIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ReviewIcon } from './icons/ReviewIcon';
import { StarIcon } from './icons/StarIcon';

interface DetailRowProps {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    return (
        <div className="flex items-start py-3">
            <div className="flex-shrink-0 w-8 text-slate-400">{icon}</div>
            <div className="flex-grow">
                <p className="text-sm font-semibold text-slate-300">{label}</p>
                <div className="text-sm text-white break-words">{value}</div>
            </div>
        </div>
    );
};

interface SocialLinksProps {
    links: string[];
}

const SocialLinks: React.FC<SocialLinksProps> = ({ links }) => {
    if (!links || links.length === 0) {
        return <p className="text-sm text-slate-400">Not found</p>;
    }
    return (
        <div className="flex flex-wrap gap-2">
            {links.map((link, index) => (
                <a 
                    key={index} 
                    href={link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="bg-slate-700 hover:bg-slate-600 text-blue-300 text-xs font-medium px-2 py-1 rounded transition-colors"
                >
                    {new URL(link).hostname.replace('www.', '')}
                </a>
            ))}
        </div>
    );
}

export const BusinessDetailCard: React.FC<{ business: Business }> = ({ business }) => {
    const reviewInfo = [
        business.reviewCount != null ? `${business.reviewCount.toLocaleString()} reviews` : null,
        business.rating != null ? `${business.rating.toFixed(1)} stars` : null,
    ].filter(Boolean).join(' • ');

    return (
        <div className="space-y-6">
            <header>
                <h3 className="text-2xl font-bold text-white">{business.name || 'N/A'}</h3>
                <p className="text-md text-slate-400">{business.category || 'Category not specified'}</p>
                 {business.rating != null && (
                    <div className="flex items-center gap-2 mt-2">
                        <span className="font-bold text-lg text-white">{business.rating.toFixed(1)}</span>
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <StarIcon key={i} className={`w-5 h-5 ${i < Math.round(business.rating || 0) ? 'text-yellow-400' : 'text-slate-600'}`} />
                            ))}
                        </div>
                        {business.reviewCount != null && <span className="text-slate-400 text-sm">({business.reviewCount.toLocaleString()} reviews)</span>}
                    </div>
                )}
            </header>

            <p className="text-sm text-slate-300 leading-relaxed">{business.description || 'No description available.'}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-2 divide-y divide-slate-800">
                    <h4 className="text-lg font-semibold text-white pb-2">Contact & Location</h4>
                    <DetailRow icon={<MapPinIcon className="w-5 h-5" />} label="Address" value={business.address} />
                    <DetailRow icon={<PhoneIcon className="w-5 h-5" />} label="Phone" value={business.phone} />
                    <DetailRow icon={<WebsiteIcon className="w-5 h-5" />} label="Website" value={
                        business.website ? <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{business.website}</a> : 'Not Found'
                    }/>
                </div>

                <div className="space-y-2 divide-y divide-slate-800">
                    <h4 className="text-lg font-semibold text-white pb-2">Reviews & People</h4>
                     <DetailRow icon={<ReviewIcon className="w-5 h-5" />} label="Last Owner Reply" value={business.recentReviewReplyDate || 'N/A'} />
                    <DetailRow icon={<UserIcon className="w-5 h-5" />} label="Owner" value={business.ownerName} />
                    <DetailRow icon={<UsersIcon className="w-5 h-5" />} label="Owner's Socials" value={<SocialLinks links={business.ownerSocialMedia || []} />} />
                </div>
            </div>

            <div className="space-y-2 divide-y divide-slate-800 border-t border-slate-800 pt-4">
                 <h4 className="text-lg font-semibold text-white pb-2">Company Social Presence</h4>
                 <div className="pt-3">
                    <SocialLinks links={business.companySocialMedia || []} />
                 </div>
            </div>
        </div>
    );
};