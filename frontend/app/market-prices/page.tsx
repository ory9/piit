'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface CommodityItem {
  id: string;
  name: string;
  unit: string;
  price: number;
  previousPrice: number | null;
  marketType: 'RETAIL' | 'WHOLESALE';
  location: string | null;
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatUGX(value: number): string {
  return `UGX ${value.toLocaleString('en-UG', { maximumFractionDigits: value % 1 === 0 ? 0 : 2 })}`;
}

function trend(item: CommodityItem): 'up' | 'down' | 'flat' {
  if (item.previousPrice == null || item.previousPrice === item.price) return 'flat';
  return item.price > item.previousPrice ? 'up' : 'down';
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ─── TrendBadge ───────────────────────────────────────────────────────────── */

function TrendBadge({ item }: { item: CommodityItem }) {
  const dir = trend(item);
  const changePct =
    item.previousPrice && item.previousPrice > 0
      ? (((item.price - item.previousPrice) / item.previousPrice) * 100).toFixed(1)
      : null;

  if (dir === 'flat') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400">— no change</span>;
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${dir === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        {dir === 'up' ? <path d="M10 3l6 8h-4v6H8v-6H4l6-8z" /> : <path d="M10 17l-6-8h4V3h4v6h4l-6 8z" />}
      </svg>
      {changePct ? `${dir === 'up' ? '+' : ''}${changePct}%` : dir === 'up' ? 'Up' : 'Down'}
    </span>
  );
}

/* ─── Main page ────────────────────────────────────────────────────────────── */

export default function MarketPricesPage() {
  const [items, setItems] = useState<CommodityItem[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [marketTypeFilter, setMarketTypeFilter] = useState<'' | 'RETAIL' | 'WHOLESALE'>('');

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.get('/commodity-prices'),
      api.get('/commodity-prices/locations'),
    ]).then(([pricesResult, locationsResult]) => {
      if (pricesResult.status === 'fulfilled') {
        setItems(pricesResult.value.data?.items || []);
        setUpdatedAt(pricesResult.value.data?.updatedAt || null);
      }
      if (locationsResult.status === 'fulfilled') {
        setLocations(locationsResult.value.data?.locations || []);
      }
    }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (q && !item.name.toLowerCase().includes(q)) return false;
      if (locationFilter && (item.location || '') !== locationFilter) return false;
      if (marketTypeFilter && item.marketType !== marketTypeFilter) return false;
      return true;
    });
  }, [items, search, locationFilter, marketTypeFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Market Prices' }]} className="mb-4" />

      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl shadow-md shrink-0">
          🌾
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Uganda Market Price Watch</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Everyday commodity prices across Uganda, kept up to date by our team so buyers, traders, and businesses can check fair market value before they buy or sell.
          </p>
          {updatedAt && (
            <p className="text-xs text-gray-400 mt-1">Last updated {relativeTime(updatedAt)}</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search commodities…"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All locations</option>
          {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
        </select>
        <select
          value={marketTypeFilter}
          onChange={(e) => setMarketTypeFilter(e.target.value as '' | 'RETAIL' | 'WHOLESALE')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">Retail &amp; Wholesale</option>
          <option value="RETAIL">Retail only</option>
          <option value="WHOLESALE">Wholesale only</option>
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🌾</p>
          <p className="text-sm">
            {items.length === 0 ? "Prices haven't been published yet — check back soon." : 'No commodities match your search or filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="font-bold text-gray-900 text-sm">{item.name}</h3>
                <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${item.marketType === 'WHOLESALE' ? 'bg-violet-100 text-violet-700' : 'bg-red-100 text-red-700'}`}>
                  {item.marketType === 'WHOLESALE' ? 'Wholesale' : 'Retail'}
                </span>
              </div>
              <p className="text-xl font-black text-gray-900 tabular-nums">{formatUGX(item.price)}</p>
              <p className="text-xs text-gray-400 mb-2">per {item.unit}</p>
              <div className="flex items-center justify-between">
                <TrendBadge item={item} />
                {item.location && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {item.location}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-8 text-center">
        Prices are indicative retail/wholesale figures for common Uganda markets and are updated periodically by our team — treat them as a guide, not a live trading feed.
      </p>
    </div>
  );
}
