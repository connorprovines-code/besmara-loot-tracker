import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Plus, Trash2, Coins, Package, History, ShoppingCart, MinusCircle, PlusCircle, Edit2, Settings, UserPlus, UserMinus, FileText } from 'lucide-react';

const App = () => {
  const [players, setPlayers] = useState([]);
  const [activeView, setActiveView] = useState('loot');
  const [activeInventory, setActiveInventory] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [incomingLoot, setIncomingLoot] = useState([]);
  const [inventories, setInventories] = useState({});
  const [gold, setGold] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [masterLog, setMasterLog] = useState([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [buyingPlayer, setBuyingPlayer] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', value: '', isTreasure: false, charges: null, consumable: false });
  const [bulkImportText, setBulkImportText] = useState('');
  const [parsedBulkItems, setParsedBulkItems] = useState([]);
  const [editingGold, setEditingGold] = useState(null);

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (players.length > 0 && !activeInventory) {
      setActiveInventory(players[0]);
    }
  }, [players]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load players
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .order('created_at');
      
      const playerNames = playersData?.map(p => p.name) || [];
      setPlayers(playerNames);
      
      // Build gold object
      const goldObj = {};
      playersData?.forEach(p => {
        goldObj[p.name] = p.gold;
      });
      
      // Load party fund
      const { data: partyData } = await supabase
        .from('party_fund')
        .select('*')
        .single();
      
      goldObj['Party Fund'] = partyData?.gold || 0;
      setGold(goldObj);
      
      // Load items
      const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Separate items by status
      const incoming = itemsData?.filter(i => i.status === 'incoming') || [];
      setIncomingLoot(incoming);
      
      // Build inventories object
      const invs = { Party: [] };
      playerNames.forEach(name => {
        invs[name] = [];
      });
      
      itemsData?.filter(i => i.status === 'assigned' || i.status === 'purchased').forEach(item => {
        if (item.assigned_to && invs[item.assigned_to]) {
          invs[item.assigned_to].push({
            id: item.id,
            name: item.name,
            value: item.value,
            originalValue: item.original_value || item.value,
            isTreasure: item.is_treasure,
            charges: item.charges,
            consumable: item.consumable
          });
        }
      });
      
      setInventories(invs);
      setMasterLog(itemsData || []);
      
      // Load transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      setTransactions(txData || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data. Check console.');
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (type, description, amount, affectedParties) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        type,
        description,
        amount,
        affected_parties: affectedParties
      }])
      .select()
      .single();
    
    if (!error && data) {
      setTransactions(prev => [data, ...prev]);
    }
  };

  const distributeGold = async (totalGold, description) => {
    const shareCount = players.length + 1;
    const share = Math.floor(totalGold / shareCount);
    
    // Update all players
    for (const player of players) {
      await supabase
        .from('players')
        .update({ gold: gold[player] + share })
        .eq('name', player);
    }
    
    // Update party fund
    await supabase
      .from('party_fund')
      .update({ gold: gold['Party Fund'] + share });
    
    // Update local state
    const newGold = { ...gold };
    players.forEach(player => {
      newGold[player] += share;
    });
    newGold['Party Fund'] += share;
    setGold(newGold);
    
    await addTransaction('sell', description, totalGold, 'all');
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.value) return;
    
    const { data, error } = await supabase
      .from('items')
      .insert([{
        name: newItem.name,
        value: parseFloat(newItem.value),
        is_treasure: newItem.isTreasure,
        charges: newItem.charges ? parseInt(newItem.charges) : null,
        consumable: newItem.consumable || false,
        status: 'incoming'
      }])
      .select()
      .single();
    
    if (!error && data) {
      setIncomingLoot(prev => [data, ...prev]);
      setMasterLog(prev => [data, ...prev]);
    }
    
    setNewItem({ name: '', value: '', isTreasure: false, charges: null, consumable: false });
    setShowAddModal(false);
  };

  const handleSellItem = async (item) => {
    const sellValue = item.is_treasure ? item.value : Math.floor(item.value * 0.5);
    await distributeGold(sellValue, `Sold ${item.name} (${item.is_treasure ? 'Treasure' : 'Loot - 50%'})`);
    
    await supabase
      .from('items')
      .update({ status: 'sold' })
      .eq('id', item.id);
    
    setIncomingLoot(prev => prev.filter(i => i.id !== item.id));
    setMasterLog(prev => prev.map(i => i.id === item.id ? { ...i, status: 'sold' } : i));
  };

  const handleAssignItem = async (item, player) => {
    await supabase
      .from('items')
      .update({ 
        status: 'assigned',
        assigned_to: player,
        original_value: item.value
      })
      .eq('id', item.id);
    
    const assignedItem = {
      id: item.id,
      name: item.name,
      value: item.value,
      originalValue: item.value,
      isTreasure: item.is_treasure,
      charges: item.charges,
      consumable: item.consumable || false
    };
    
    setInventories(prev => ({
      ...prev,
      [player]: [...(prev[player] || []), assignedItem]
    }));
    
    setIncomingLoot(prev => prev.filter(i => i.id !== item.id));
    setMasterLog(prev => prev.map(i => i.id === item.id ? { ...i, status: 'assigned', assigned_to: player } : i));
    
    await addTransaction('assign', `${item.name} assigned to ${player}`, 0, player);
    
    setShowAssignModal(false);
    setSelectedItem(null);
  };

  const handleSellFromInventory = async (player, item) => {
    const sellValue = item.isTreasure ? item.originalValue : Math.floor(item.originalValue * 0.5);
    await distributeGold(sellValue, `${player} sold ${item.name}`);
    
    await supabase
      .from('items')
      .update({ status: 'sold' })
      .eq('id', item.id);
    
    setInventories(prev => ({
      ...prev,
      [player]: prev[player].filter(i => i.id !== item.id)
    }));
    
    setMasterLog(prev => prev.map(i => i.id === item.id ? { ...i, status: 'sold' } : i));
  };

  const handleUseCharge = async (player, item, delta) => {
    const newCharges = Math.max(0, item.charges + delta);
    
    if (newCharges === 0) {
      // Remove from inventory, mark as depleted
      await supabase
        .from('items')
        .update({ status: 'depleted', charges: 0 })
        .eq('id', item.id);
      
      setInventories(prev => ({
        ...prev,
        [player]: prev[player].filter(i => i.id !== item.id)
      }));
      
      setMasterLog(prev => prev.map(i => i.id === item.id ? { ...i, status: 'depleted', charges: 0 } : i));
      await addTransaction('depleted', `${item.name} depleted (${player})`, 0, player);
    } else {
      // Update charges
      await supabase
        .from('items')
        .update({ charges: newCharges })
        .eq('id', item.id);
      
      setInventories(prev => ({
        ...prev,
        [player]: prev[player].map(i => i.id === item.id ? { ...i, charges: newCharges } : i)
      }));
      
      setMasterLog(prev => prev.map(i => i.id === item.id ? { ...i, charges: newCharges } : i));
    }
  };

  const handleBuyItem = async () => {
    if (!newItem.name || !newItem.value || !buyingPlayer) return;
    
    const cost = parseFloat(newItem.value);
    const goldKey = buyingPlayer === 'Party' ? 'Party Fund' : buyingPlayer;
    
    if (gold[goldKey] < cost) {
      alert('Not enough gold!');
      return;
    }
    
    // Insert item
    const { data: itemData, error } = await supabase
      .from('items')
      .insert([{
        name: newItem.name,
        value: cost,
        original_value: cost,
        is_treasure: newItem.isTreasure,
        charges: newItem.charges ? parseInt(newItem.charges) : null,
        consumable: newItem.consumable || false,
        status: 'purchased',
        assigned_to: buyingPlayer
      }])
      .select()
      .single();
    
    if (error) {
      alert('Error buying item');
      return;
    }
    
    // Update gold
    if (buyingPlayer === 'Party') {
      await supabase
        .from('party_fund')
        .update({ gold: gold[goldKey] - cost });
    } else {
      await supabase
        .from('players')
        .update({ gold: gold[goldKey] - cost })
        .eq('name', buyingPlayer);
    }
    
    const item = {
      id: itemData.id,
      name: itemData.name,
      value: itemData.value,
      originalValue: itemData.original_value,
      isTreasure: itemData.is_treasure,
      charges: itemData.charges,
      consumable: itemData.consumable
    };
    
    setInventories(prev => ({
      ...prev,
      [buyingPlayer]: [...(prev[buyingPlayer] || []), item]
    }));
    
    setGold(prev => ({
      ...prev,
      [goldKey]: prev[goldKey] - cost
    }));
    
    setMasterLog(prev => [itemData, ...prev]);
    await addTransaction('purchase', `${buyingPlayer} bought ${newItem.name}`, -cost, buyingPlayer);
    
    setNewItem({ name: '', value: '', isTreasure: false, charges: null, consumable: false });
    setShowBuyModal(false);
    setBuyingPlayer(null);
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    if (players.includes(newPlayerName.trim())) {
      alert('Player already exists!');
      return;
    }
    
    const playerName = newPlayerName.trim();
    
    const { error } = await supabase
      .from('players')
      .insert([{ name: playerName, gold: 0 }]);
    
    if (error) {
      alert('Error adding player');
      return;
    }
    
    setPlayers(prev => [...prev, playerName]);
    setInventories(prev => ({ ...prev, [playerName]: [] }));
    setGold(prev => ({ ...prev, [playerName]: 0 }));
    setNewPlayerName('');
    setShowPlayerModal(false);
  };

  const handleRemovePlayer = async (playerName) => {
    if (inventories[playerName]?.length > 0) {
      if (!confirm(`${playerName} still has items in inventory. Remove anyway?`)) {
        return;
      }
    }
    
    await supabase
      .from('players')
      .delete()
      .eq('name', playerName);
    
    setPlayers(prev => prev.filter(p => p !== playerName));
  };

const handleGoldEdit = async (entity, newValue) => {
  const value = parseInt(newValue);
  if (isNaN(value)) return;
  
  if (entity === 'Party Fund') {
    // Get the party fund row first
    const { data: partyData } = await supabase
      .from('party_fund')
      .select('id')
      .limit(1)
      .single();
    
    if (partyData) {
      await supabase
        .from('party_fund')
        .update({ gold: value })
        .eq('id', partyData.id);
    }
  } else {
      await supabase
        .from('players')
        .update({ gold: value })
        .eq('name', entity);
    }
    
    setGold(prev => ({ ...prev, [entity]: value }));
    await addTransaction('manual', `Manual adjustment for ${entity}`, value - gold[entity], entity);
    setEditingGold(null);
  };

  const parseBulkImport = () => {
    const lines = bulkImportText.split('\n').filter(line => line.trim());
    const items = [];
    
    lines.forEach(line => {
      const match = line.match(/^\*?\s*(\d+)\s+(.+?)\s*=\s*([0-9.]+)\s*gp/i);
      
      if (match) {
        const quantity = parseInt(match[1]);
        const name = match[2].trim();
        const pricePerUnit = parseFloat(match[3]);
        const totalPrice = pricePerUnit * quantity;
        
        items.push({
          id: Date.now() + Math.random(),
          quantity,
          name,
          pricePerUnit,
          totalPrice,
          isTreasure: false,
          charges: null,
          consumable: false
        });
      }
    });
    
    setParsedBulkItems(items);
  };

  const updateParsedItem = (id, field, value) => {
    setParsedBulkItems(items =>
      items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const confirmBulkImport = async () => {
    const itemsToInsert = parsedBulkItems.map(parsed => ({
      name: parsed.quantity > 1 ? `${parsed.quantity}x ${parsed.name}` : parsed.name,
      value: parsed.totalPrice,
      is_treasure: parsed.isTreasure,
      charges: parsed.charges,
      consumable: parsed.consumable,
      status: 'incoming'
    }));
    
    const { data, error } = await supabase
      .from('items')
      .insert(itemsToInsert)
      .select();
    
    if (!error && data) {
      setIncomingLoot(prev => [...data, ...prev]);
      setMasterLog(prev => [...data, ...prev]);
    }
    
    setBulkImportText('');
    setParsedBulkItems([]);
    setShowBulkImportModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading Besmara's Loot...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg p-6 mb-6 shadow-2xl">
          <h1 className="text-4xl font-bold mb-2">Party Loot Tracker | Besmara's Teet</h1>
          <p className="text-cyan-100">Pathfinder 1e - Gold Distribution & Inventory</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveView('loot')}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
              activeView === 'loot' ? 'bg-cyan-600 shadow-lg' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <Package size={20} />
            Incoming Loot
          </button>
          <button
            onClick={() => setActiveView('inventories')}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
              activeView === 'inventories' ? 'bg-cyan-600 shadow-lg' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <Package size={20} />
            Inventories
          </button>
          <button
            onClick={() => setActiveView('gold')}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
              activeView === 'gold' ? 'bg-cyan-600 shadow-lg' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <Coins size={20} />
            Gold Tracking
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
              activeView === 'history' ? 'bg-cyan-600 shadow-lg' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <History size={20} />
            Master Log
          </button>
          <button
            onClick={() => setActiveView('settings')}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
              activeView === 'settings' ? 'bg-cyan-600 shadow-lg' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <Settings size={20} />
            Settings
          </button>
        </div>

        {/* Incoming Loot View */}
        {activeView === 'loot' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Unprocessed Loot</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkImportModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <FileText size={20} />
                  Bulk Import
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus size={20} />
                  Add Item
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {incomingLoot.map(item => (
                <div key={item.id} className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{item.name}</h3>
                      <div className="flex gap-3 mt-2 text-sm">
                        <span className="text-cyan-400 font-semibold">{item.value} gp</span>
                        <span className={`px-2 py-1 rounded ${item.is_treasure ? 'bg-purple-600' : 'bg-blue-600'}`}>
                          {item.is_treasure ? 'Treasure' : 'Loot (50% sell)'}
                        </span>
                        {item.charges && (
                          <span className="px-2 py-1 rounded bg-green-600">
                            {item.charges} charges
                          </span>
                        )}
                        {item.consumable && (
                          <span className="px-2 py-1 rounded bg-purple-500">
                            Consumable
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await supabase.from('items').delete().eq('id', item.id);
                        setIncomingLoot(prev => prev.filter(i => i.id !== item.id));
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSellItem(item)}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700 px-4 py-3 rounded-lg font-medium transition-colors"
                    >
                      Sell ({item.is_treasure ? item.value : Math.floor(item.value * 0.5)} gp ÷ {players.length + 1})
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setShowAssignModal(true);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg font-medium transition-colors"
                    >
                      Assign to Player
                    </button>
                  </div>
                </div>
              ))}

              {incomingLoot.length === 0 && (
                <div className="bg-slate-800 rounded-lg p-12 text-center text-slate-400 border border-slate-700">
                  <Package size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No loot to process. Add items as you find them!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inventories View */}
        {activeView === 'inventories' && (
          <div>
            {/* Inventory Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
              {[...players, 'Party'].map(entity => (
                <button
                  key={entity}
                  onClick={() => setActiveInventory(entity)}
                  className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                    activeInventory === entity ? 'bg-cyan-600 shadow-lg' : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  {entity}
                </button>
              ))}
              <button
                onClick={() => setActiveInventory('Consumables')}
                className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeInventory === 'Consumables' ? 'bg-cyan-600 shadow-lg' : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                Consumables
              </button>
            </div>

            {/* Current Inventory */}
            {activeInventory !== 'Consumables' && (
              <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">{activeInventory}</h3>
                  <div className="text-cyan-400 font-bold text-xl">
                    {gold[activeInventory] || gold['Party Fund']} gp
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {inventories[activeInventory]?.map(item => (
                    <div key={item.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="font-semibold text-lg">{item.name}</div>
                          <div className="text-sm text-slate-300 mt-1 flex gap-2 items-center">
                            <span>{item.originalValue} gp {item.isTreasure ? '(Treasure)' : '(Loot)'}</span>
                            {item.consumable && (
                              <span className="px-2 py-0.5 rounded bg-purple-600 text-xs">Consumable</span>
                            )}
                          </div>
                        </div>
                        {item.charges !== null && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUseCharge(activeInventory, item, -1)}
                              className="bg-red-500 hover:bg-red-600 p-1 rounded transition-colors"
                            >
                              <MinusCircle size={18} />
                            </button>
                            <span className="font-mono font-bold w-10 text-center text-lg">{item.charges}</span>
                            <button
                              onClick={() => handleUseCharge(activeInventory, item, 1)}
                              className="bg-green-500 hover:bg-green-600 p-1 rounded transition-colors"
                            >
                              <PlusCircle size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleSellFromInventory(activeInventory, item)}
                        className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded text-sm transition-colors inline-flex items-center gap-2"
                      >
                        <Coins size={16} />
                        Sell for {item.isTreasure ? item.originalValue : Math.floor(item.originalValue * 0.5)} gp (split)
                      </button>
                    </div>
                  ))}

                  {(!inventories[activeInventory] || inventories[activeInventory].length === 0) && (
                    <div className="text-center text-slate-400 py-8">Empty inventory</div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setBuyingPlayer(activeInventory);
                    setShowBuyModal(true);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <ShoppingCart size={18} />
                  Buy Item for {activeInventory}
                </button>
              </div>
            )}

            {/* Consumables View */}
            {activeInventory === 'Consumables' && (
              <div className="space-y-6">
                {[...players, 'Party'].map(owner => {
                  const consumables = inventories[owner]?.filter(item => item.consumable && item.charges !== null) || [];
                  if (consumables.length === 0) return null;
                  
                  return (
                    <div key={owner} className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">{owner}'s Consumables</h3>
                        <div className="text-cyan-400 font-bold">{gold[owner] || gold['Party Fund']} gp</div>
                      </div>
                      
                      <div className="space-y-3">
                        {consumables.map(item => (
                          <div key={item.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="font-semibold">{item.name}</div>
                                <div className="text-sm text-slate-300 mt-1">{item.originalValue} gp</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleUseCharge(owner, item, -1)}
                                  className="bg-red-500 hover:bg-red-600 p-2 rounded transition-colors"
                                >
                                  <MinusCircle size={20} />
                                </button>
                                <span className="font-mono font-bold w-12 text-center text-xl">{item.charges}</span>
                                <button
                                  onClick={() => handleUseCharge(owner, item, 1)}
                                  className="bg-green-500 hover:bg-green-600 p-2 rounded transition-colors"
                                >
                                  <PlusCircle size={20} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {[...players, 'Party'].every(owner => 
                  (inventories[owner]?.filter(item => item.consumable && item.charges !== null) || []).length === 0
                ) && (
                  <div className="bg-slate-800 rounded-lg p-12 text-center text-slate-400 border border-slate-700">
                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No consumable items. Mark items as "Consumable" when adding them!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Gold Tracking View */}
        {activeView === 'gold' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Current Gold</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(gold).map(([entity, amount]) => (
                <div key={entity} className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
                  <div className="text-slate-300 mb-2">{entity}</div>
                  {editingGold === entity ? (
                    <input
                      type="number"
                      defaultValue={amount}
                      autoFocus
                      onBlur={(e) => handleGoldEdit(entity, e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleGoldEdit(entity, e.target.value);
                        }
                      }}
                      className="text-3xl font-bold text-cyan-400 bg-slate-700 rounded px-2 py-1 w-full"
                    />
                  ) : (
                    <div
                      onClick={() => setEditingGold(entity)}
                      className="text-3xl font-bold text-cyan-400 cursor-pointer hover:text-cyan-300 flex items-center gap-2"
                    >
                      {amount} gp
                      <Edit2 size={20} className="text-slate-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <h2 className="text-2xl font-bold mt-8">Recent Transactions</h2>
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="bg-slate-800 rounded-lg p-4 flex justify-between items-center border border-slate-700">
                  <div>
                    <div className="font-medium">{tx.description}</div>
                    <div className="text-sm text-slate-400">
                      {new Date(tx.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className={`font-bold ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} gp
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Master Log View */}
        {activeView === 'history' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Master Item Log</h2>
            <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Assigned To</th>
                    <th className="px-4 py-3 text-left">Charges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {masterLog.map(item => (
                    <tr key={item.id} className="hover:bg-slate-750">
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          item.status === 'sold' ? 'bg-cyan-600' :
                          item.status === 'assigned' ? 'bg-blue-600' :
                          item.status === 'depleted' ? 'bg-red-600' :
                          item.status === 'purchased' ? 'bg-green-600' :
                          'bg-slate-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.assigned_to || '—'}</td>
                      <td className="px-4 py-3">{item.charges !== null ? item.charges : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings View */}
        {activeView === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Campaign Settings</h2>
            
            <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Party Members</h3>
                <button
                  onClick={() => setShowPlayerModal(true)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <UserPlus size={18} />
                  Add Player
                </button>
              </div>

              <div className="text-sm text-slate-400 mb-4">
                Gold is split {players.length + 1} ways ({players.length} players + Party Fund)
              </div>

              <div className="space-y-3">
                {players.map(player => (
                  <div key={player} className="bg-slate-700 rounded-lg p-4 flex justify-between items-center border border-slate-600">
                    <div>
                      <div className="font-semibold">{player}</div>
                      <div className="text-sm text-slate-400">
                        {gold[player]} gp • {inventories[player]?.length || 0} items
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemovePlayer(player)}
                      className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
                    >
                      <UserMinus size={18} />
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
                <div className="font-semibold mb-2">Party Fund</div>
                <div className="text-sm text-slate-400">
                  {gold['Party Fund']} gp • {inventories['Party']?.length || 0} items
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals - Same as before but with async handlers */}
      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Add New Item</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Item Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full bg-slate-700 rounded px-4 py-2 text-white border border-slate-600"
                  placeholder="e.g., Longsword +1"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Value (gp)</label>
                <input
                  type="number"
                  value={newItem.value}
                  onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                  className="w-full bg-slate-700 rounded px-4 py-2 text-white border border-slate-600"
                  placeholder="2315"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Charges (optional)</label>
                <input
                  type="number"
                  value={newItem.charges || ''}
                  onChange={(e) => setNewItem({ ...newItem, charges: e.target.value })}
                  className="w-full bg-slate-700 rounded px-4 py-2 text-white border border-slate-600"
                  placeholder="Leave empty if no charges"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newItem.isTreasure}
                  onChange={(e) => setNewItem({ ...newItem, isTreasure: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm">Treasure (sells at full value, not 50%)</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newItem.consumable}
                  onChange={(e) => setNewItem({ ...newItem, consumable: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm">Consumable (appears in Consumables tab)</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Player Modal */}
      {showAssignModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Assign {selectedItem.name}</h3>
            <div className="space-y-2">
              {[...players, 'Party'].map(player => (
                <button
                  key={player}
                  onClick={() => handleAssignItem(selectedItem, player)}
                  className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded transition-colors text-left"
                >
                  {player} ({gold[player] || gold['Party Fund']} gp)
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowAssignModal(false);
                setSelectedItem(null);
              }}
              className="w-full mt-4 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Buy Item Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Buy Item for {buyingPlayer}</h3>
            <div className="mb-4 text-sm text-slate-300">
              Current gold: <span className="text-cyan-400 font-bold">{gold[buyingPlayer] || gold['Party Fund']} gp</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Item Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full bg-slate-700 rounded px-4 py-2 text-white border border-slate-600"
                  placeholder="e.g., Rope (50 ft)"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Cost (gp)</label>
                <input
                  type="number"
                  value={newItem.value}
                  onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                  className="w-full bg-slate-700 rounded px-4 py-2 text-white border border-slate-600"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Charges (optional)</label>
                <input
                  type="number"
                  value={newItem.charges || ''}
                  onChange={(e) => setNewItem({ ...newItem, charges: e.target.value })}
                  className="w-full bg-slate-700 rounded px-4 py-2 text-white border border-slate-600"
                  placeholder="Leave empty if no charges"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newItem.isTreasure}
                  onChange={(e) => setNewItem({ ...newItem, isTreasure: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm">Treasure (can sell at full value later)</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newItem.consumable}
                  onChange={(e) => setNewItem({ ...newItem, consumable: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm">Consumable (appears in Consumables tab)</label>
              </div>
              <div className="text-sm text-slate-400">
                Note: Items can be sold later at {newItem.isTreasure ? '100%' : '50%'} value
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowBuyModal(false);
                  setBuyingPlayer(null);
                  setNewItem({ name: '', value: '', isTreasure: false, charges: null, consumable: false });
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBuyItem}
                className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
              >
                Buy Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      {showPlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Add New Player</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Player Name</label>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddPlayer();
                    }
                  }}
                  className="w-full bg-slate-700 rounded px-4 py-2 text-white border border-slate-600"
                  placeholder="e.g., Torvin"
                  autoFocus
                />
              </div>
              <div className="text-sm text-slate-400">
                New player starts with 0 gp and empty inventory
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPlayerModal(false);
                  setNewPlayerName('');
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlayer}
                className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
              >
                Add Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full border border-slate-700 my-8">
            <h3 className="text-xl font-bold mb-4">Bulk Import Loot</h3>
            
            {parsedBulkItems.length === 0 ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm mb-2">Paste your loot list:</label>
                  <textarea
                    value={bulkImportText}
                    onChange={(e) => setBulkImportText(e.target.value)}
                    className="w-full bg-slate-700 rounded px-4 py-2 text-white border border-slate-600 font-mono text-sm h-64"
                    placeholder="* 4 mwk breastplate = 700 gp&#10;* 4 dagger = 4 gp&#10;* 1 spellbook = 7.5 gp&#10;&#10;Format: * [quantity] [item name] = [price per unit] gp"
                  />
                </div>
                <div className="text-sm text-slate-400 mb-4">
                  <div className="font-semibold mb-2">Format examples:</div>
                  <div className="bg-slate-900 rounded p-3 font-mono text-xs space-y-1">
                    <div>* 4 mwk breastplate = 700 gp</div>
                    <div>* 10 crossbow bolts = 0.5 gp</div>
                    <div>* 1 spellbook = 7.5 gp</div>
                  </div>
                  <div className="mt-2">Price should be <strong>per unit</strong>. We'll multiply by quantity automatically.</div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowBulkImportModal(false);
                      setBulkImportText('');
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={parseBulkImport}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
                  >
                    Parse Items
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 text-sm text-slate-300">
                  Found {parsedBulkItems.length} items. Review and configure:
                </div>
                <div className="bg-slate-900 rounded-lg overflow-x-auto mb-4 max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-slate-950 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs">Qty</th>
                        <th className="px-3 py-2 text-left text-xs">Item Name</th>
                        <th className="px-3 py-2 text-left text-xs">Price/Unit</th>
                        <th className="px-3 py-2 text-left text-xs">Total</th>
                        <th className="px-3 py-2 text-left text-xs">Treasure</th>
                        <th className="px-3 py-2 text-left text-xs">Consumable</th>
                        <th className="px-3 py-2 text-left text-xs">Charges</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {parsedBulkItems.map(item => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-sm">{item.quantity}</td>
                          <td className="px-3 py-2 text-sm font-medium">{item.name}</td>
                          <td className="px-3 py-2 text-sm text-cyan-400">{item.pricePerUnit} gp</td>
                          <td className="px-3 py-2 text-sm font-bold text-cyan-300">{item.totalPrice} gp</td>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={item.isTreasure}
                              onChange={(e) => updateParsedItem(item.id, 'isTreasure', e.target.checked)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={item.consumable}
                              onChange={(e) => updateParsedItem(item.id, 'consumable', e.target.checked)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.charges || ''}
                              onChange={(e) => updateParsedItem(item.id, 'charges', e.target.value ? parseInt(e.target.value) : null)}
                              className="w-16 bg-slate-800 rounded px-2 py-1 text-sm border border-slate-600"
                              placeholder="—"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setParsedBulkItems([]);
                      setBulkImportText('');
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded transition-colors"
                  >
                    Back to Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkImportModal(false);
                      setParsedBulkItems([]);
                      setBulkImportText('');
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmBulkImport}
                    className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
                  >
                    Import {parsedBulkItems.length} Items
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;