import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

const Pf1eApiSearchModal = ({ isOpen, onClose, onSelectItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allItems, setAllItems] = useState(null);

  // Load items data once when modal opens for the first time
  useEffect(() => {
    if (isOpen && !allItems) {
      loadItemsDatabase();
    }
  }, [isOpen]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  const loadItemsDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/pf1e-items.json');
      if (!response.ok) {
        throw new Error('Failed to load Pathfinder 1e items database');
      }
      const data = await response.json();
      setAllItems(data);
    } catch (err) {
      console.error('Error loading items:', err);
      setError('Failed to load items database. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Parse PF1e price string (e.g., "15 gp", "1,000 gp", "5 sp") to gold value
  const parsePriceToGold = (priceString) => {
    if (!priceString || priceString === '—' || priceString.toLowerCase() === 'varies') {
      return 0;
    }

    // Remove commas and extract number and currency
    const cleaned = priceString.replace(/,/g, '').replace(/&mdash;/g, '');
    const match = cleaned.match(/(\d+(?:\.\d+)?)\s*(cp|sp|gp|pp)/i);

    if (!match) return 0;

    const amount = parseFloat(match[1]);
    const currency = match[2].toLowerCase();

    switch (currency) {
      case 'cp': return amount / 100;
      case 'sp': return amount / 10;
      case 'gp': return amount;
      case 'pp': return amount * 10;
      default: return amount;
    }
  };

  // Parse weight string (e.g., "4 lbs.", "1/2 lb.") to numeric value
  const parseWeight = (weightString) => {
    if (!weightString || weightString === '—' || weightString === '&mdash;') return null;

    // Handle fractions like "1/2 lb."
    const fractionMatch = weightString.match(/(\d+)\/(\d+)/);
    if (fractionMatch) {
      return parseFloat(fractionMatch[1]) / parseFloat(fractionMatch[2]);
    }

    // Extract number
    const match = weightString.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  };

  // Strip HTML tags from body text
  const stripHTML = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').trim();
  };

  const searchItems = () => {
    if (!searchTerm.trim() || !allItems) return;

    setLoading(true);
    setError(null);

    try {
      // Filter items by search term
      const filtered = allItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 50); // Limit to 50 results

      setResults(filtered);
      if (filtered.length === 0) {
        setError(`No items found matching "${searchTerm}". Try a different search term.`);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Error searching items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item) => {
    const goldValue = parsePriceToGold(item.price);
    const weight = parseWeight(item.weight);

    // Build description from available data
    const descriptionParts = [];
    if (item.body) {
      const cleanBody = stripHTML(item.body);
      if (cleanBody.length > 0) {
        descriptionParts.push(cleanBody.substring(0, 500)); // Limit to 500 chars
      }
    }
    if (item.source) {
      descriptionParts.push(`Source: ${item.source}`);
    }
    if (item.aura) {
      descriptionParts.push(`Aura: ${item.aura}`);
    }
    if (item.slot) {
      descriptionParts.push(`Slot: ${item.slot}`);
    }
    if (item.cl) {
      descriptionParts.push(`CL: ${item.cl}`);
    }

    const notes = descriptionParts.join('\n\n');

    onSelectItem({
      name: item.name,
      value: goldValue,
      notes: notes || '',
      weight: weight
    });

    // Reset and close
    setSearchTerm('');
    setResults([]);
    setError(null);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchItems();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full border border-slate-700 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Search Pathfinder 1e Items</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Info Badge */}
        {allItems && (
          <div className="mb-3 text-xs text-slate-400">
            Searching {allItems.length.toLocaleString()} items from Core Rulebook & Ultimate Equipment
          </div>
        )}

        {/* Search Input */}
        <div className="space-y-3 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search for items (e.g., 'longsword', 'rope', 'fireball')"
              className="flex-1 bg-slate-700 rounded px-4 py-2 text-white border border-slate-600 focus:border-amber-500 focus:outline-none"
              autoFocus
              disabled={!allItems}
            />
            <button
              onClick={searchItems}
              disabled={loading || !searchTerm.trim() || !allItems}
              className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 px-4 py-2 rounded transition-colors text-white flex items-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
              Search
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-yellow-900/30 border border-yellow-600 text-yellow-200 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {results.length > 0 ? (
            results.map((item, index) => (
              <div
                key={index}
                onClick={() => handleSelectItem(item)}
                className="bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-amber-500 rounded p-3 cursor-pointer transition-all"
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-white font-semibold">{item.name}</h4>
                    {item.source && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {item.source}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {item.weight && item.weight !== '—' && item.weight !== '&mdash;' && (
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {item.weight}
                      </span>
                    )}
                    {item.price && item.price !== '—' && item.price !== '&mdash;' && (
                      <span className="text-amber-400 font-medium whitespace-nowrap text-sm">
                        {item.price}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description Preview */}
                {item.body && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                    {stripHTML(item.body)}
                  </p>
                )}
              </div>
            ))
          ) : (
            !loading && !error && (
              <div className="text-center text-slate-400 py-12">
                <Search size={48} className="mx-auto mb-3 opacity-50" />
                <p>Enter a search term and click Search to find items</p>
                <p className="text-sm mt-1">Try "longsword", "rope", "wand", or "potion"</p>
              </div>
            )
          )}
        </div>

        {/* Loading State */}
        {loading && allItems === null && (
          <div className="text-center py-8">
            <Loader2 size={48} className="animate-spin mx-auto text-amber-500 mb-3" />
            <p className="text-slate-400">Loading item database...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pf1eApiSearchModal;
