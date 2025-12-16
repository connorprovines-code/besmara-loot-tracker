import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Building2, Coins, Users, TrendingUp, Plus, ArrowUp, History, Info, Sword, ScrollText, Hammer } from 'lucide-react';

export default function SettlementManager({ campaignId }) {
  const [settlements, setSettlements] = useState([]);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [buildingDefinitions, setBuildingDefinitions] = useState([]);
  const [productionCycle, setProductionCycle] = useState(null);
  const [loading, setLoading] = useState(true);

  // Notification state
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  // Modal states
  const [showGoldTransferModal, setShowGoldTransferModal] = useState(false);
  const [showBuyBPModal, setShowBuyBPModal] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showNewSettlementModal, setShowNewSettlementModal] = useState(false);
  const [showBuyBuildingModal, setShowBuyBuildingModal] = useState(false);

  // Modal input states
  const [goldTransferAmount, setGoldTransferAmount] = useState('');
  const [buyBPAmount, setBuyBPAmount] = useState('');
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [newSettlementName, setNewSettlementName] = useState('');
  const [selectedBuildingType, setSelectedBuildingType] = useState(null);

  const notify = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000);
  };

  useEffect(() => {
    if (campaignId) {
      loadSettlements();
      loadBuildingDefinitions();
    }
  }, [campaignId]);

  useEffect(() => {
    if (selectedSettlement) {
      loadBuildings();
      loadProductionCycle();

      // Subscribe to real-time updates
      const settlementChannel = supabase
        .channel(`settlement-${selectedSettlement.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'settlements',
          filter: `id=eq.${selectedSettlement.id}`
        }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setSelectedSettlement(payload.new);
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'settlement_buildings',
          filter: `settlement_id=eq.${selectedSettlement.id}`
        }, () => {
          loadBuildings();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'production_cycles',
          filter: `settlement_id=eq.${selectedSettlement.id}`
        }, () => {
          loadProductionCycle();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(settlementChannel);
      };
    }
  }, [selectedSettlement]);

  const loadSettlements = async () => {
    try {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSettlements(data || []);
      if (data?.length > 0 && !selectedSettlement) {
        setSelectedSettlement(data[0]);
      }
    } catch (error) {
      console.error('Error loading settlements:', error);
      notify('Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  const loadBuildingDefinitions = async () => {
    try {
      const { data, error } = await supabase
        .from('building_definitions')
        .select('*')
        .order('category', { ascending: false });

      if (error) throw error;
      setBuildingDefinitions(data || []);
    } catch (error) {
      console.error('Error loading building definitions:', error);
      notify('Failed to load building definitions');
    }
  };

  const loadBuildings = async () => {
    if (!selectedSettlement) return;

    try {
      const { data, error } = await supabase
        .from('settlement_buildings')
        .select('*')
        .eq('settlement_id', selectedSettlement.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setBuildings(data || []);
    } catch (error) {
      console.error('Error loading buildings:', error);
      notify('Failed to load buildings');
    }
  };

  const loadProductionCycle = async () => {
    if (!selectedSettlement) return;

    try {
      const { data, error } = await supabase
        .from('production_cycles')
        .select('*')
        .eq('settlement_id', selectedSettlement.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProductionCycle(data);
    } catch (error) {
      console.error('Error loading production cycle:', error);
    }
  };

  const createSettlement = async () => {
    if (!newSettlementName.trim()) {
      notify('Please enter a settlement name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('settlements')
        .insert({
          campaign_id: campaignId,
          name: newSettlementName.trim(),
          build_points: 0,
          population: 0,
          labor_available: 50
        })
        .select()
        .single();

      if (error) throw error;

      notify(`Settlement "${newSettlementName}" created successfully!`);
      setNewSettlementName('');
      setShowNewSettlementModal(false);
      loadSettlements();
      setSelectedSettlement(data);
    } catch (error) {
      console.error('Error creating settlement:', error);
      notify('Failed to create settlement');
    }
  };

  const transferGoldToBP = async () => {
    const amount = parseFloat(goldTransferAmount);
    if (!amount || amount <= 0) {
      notify('Please enter a valid amount');
      return;
    }

    try {
      // In a real implementation, this would deduct from party gold
      // For now, we'll just show the conversion rate
      const bpGained = amount / 500; // 500gp per BP

      const { error } = await supabase
        .from('settlements')
        .update({
          build_points: selectedSettlement.build_points + bpGained
        })
        .eq('id', selectedSettlement.id);

      if (error) throw error;

      notify(`Transferred ${amount}gp for ${bpGained.toFixed(1)} BP`);
      setGoldTransferAmount('');
      setShowGoldTransferModal(false);
      loadSettlements();
    } catch (error) {
      console.error('Error transferring gold:', error);
      notify('Failed to transfer gold to BP');
    }
  };

  const buyBP = async () => {
    const amount = parseFloat(buyBPAmount);
    if (!amount || amount <= 0) {
      notify('Please enter a valid amount');
      return;
    }

    const cost = amount * 500;

    try {
      const { error } = await supabase
        .from('settlements')
        .update({
          build_points: selectedSettlement.build_points + amount
        })
        .eq('id', selectedSettlement.id);

      if (error) throw error;

      notify(`Purchased ${amount} BP for ${cost}gp`);
      setBuyBPAmount('');
      setShowBuyBPModal(false);
      loadSettlements();
    } catch (error) {
      console.error('Error buying BP:', error);
      notify('Failed to purchase BP');
    }
  };

  const cashOutBP = async () => {
    const amount = parseFloat(cashOutAmount);
    if (!amount || amount <= 0) {
      notify('Please enter a valid amount');
      return;
    }

    if (amount > selectedSettlement.build_points) {
      notify('Insufficient BP');
      return;
    }

    const goldGained = amount * 500;

    try {
      const { error } = await supabase
        .from('settlements')
        .update({
          build_points: selectedSettlement.build_points - amount
        })
        .eq('id', selectedSettlement.id);

      if (error) throw error;

      notify(`Cashed out ${amount} BP for ${goldGained}gp`);
      setCashOutAmount('');
      setShowCashOutModal(false);
      loadSettlements();
    } catch (error) {
      console.error('Error cashing out BP:', error);
      notify('Failed to cash out BP');
    }
  };

  const buyBuilding = async (buildingType) => {
    const definition = buildingDefinitions.find(d => d.building_type === buildingType);
    if (!definition) return;

    const tierData = definition.tier_data[0]; // Tier 1
    const cost = tierData.bpCost;

    if (selectedSettlement.build_points < cost) {
      notify('Insufficient BP');
      return;
    }

    if (selectedSettlement.labor_available < tierData.laborCost) {
      notify('Insufficient labor');
      return;
    }

    try {
      // Deduct BP and labor
      const { error: updateError } = await supabase
        .from('settlements')
        .update({
          build_points: selectedSettlement.build_points - cost,
          labor_available: selectedSettlement.labor_available - tierData.laborCost
        })
        .eq('id', selectedSettlement.id);

      if (updateError) throw updateError;

      // Create building
      const { error: insertError } = await supabase
        .from('settlement_buildings')
        .insert({
          settlement_id: selectedSettlement.id,
          building_type: buildingType,
          tier: 1,
          status: 'constructing',
          construction_weeks_total: tierData.constructionWeeks,
          construction_weeks_remaining: tierData.constructionWeeks,
          stats: tierData
        });

      if (insertError) throw insertError;

      notify(`Started construction of ${definition.name}`);
      setShowBuyBuildingModal(false);
      loadSettlements();
      loadBuildings();
    } catch (error) {
      console.error('Error buying building:', error);
      notify('Failed to purchase building');
    }
  };

  const upgradeBuilding = async (building) => {
    const definition = buildingDefinitions.find(d => d.building_type === building.building_type);
    if (!definition) return;

    if (building.tier >= definition.max_tier) {
      notify('Building is already at max tier');
      return;
    }

    const nextTierData = definition.tier_data[building.tier]; // 0-indexed
    const cost = nextTierData.bpCost;

    if (selectedSettlement.build_points < cost) {
      notify('Insufficient BP');
      return;
    }

    if (selectedSettlement.labor_available < nextTierData.laborCost) {
      notify('Insufficient labor');
      return;
    }

    const upgradeWeeks = nextTierData.constructionWeeks;

    try {
      // Deduct BP and labor
      const { error: updateError } = await supabase
        .from('settlements')
        .update({
          build_points: selectedSettlement.build_points - cost,
          labor_available: selectedSettlement.labor_available - nextTierData.laborCost
        })
        .eq('id', selectedSettlement.id);

      if (updateError) throw updateError;

      // Update building - CRITICAL FIX: Set tier and stats NOW
      const { error: buildingError } = await supabase
        .from('settlement_buildings')
        .update({
          status: 'upgrading',
          tier: building.tier + 1,  // Set tier now
          construction_weeks_total: upgradeWeeks,
          construction_weeks_remaining: upgradeWeeks,
          stats: nextTierData  // Set stats now
        })
        .eq('id', building.id);

      if (buildingError) throw buildingError;

      notify(`Started upgrading ${definition.name} to tier ${building.tier + 1}`);
      loadSettlements();
      loadBuildings();
    } catch (error) {
      console.error('Error upgrading building:', error);
      notify('Failed to upgrade building');
    }
  };

  const advanceWeek = async () => {
    if (!selectedSettlement) return;

    try {
      let cycleToUpdate = productionCycle;

      // Create new cycle if none exists
      if (!cycleToUpdate) {
        const { data: newCycle, error: cycleError } = await supabase
          .from('production_cycles')
          .insert({
            settlement_id: selectedSettlement.id,
            cycle_number: 1,
            weeks_remaining: 4,
            total_production: 0,
            is_active: true
          })
          .select()
          .single();

        if (cycleError) throw cycleError;
        cycleToUpdate = newCycle;
      }

      // Advance construction on buildings
      const constructingBuildings = buildings.filter(b =>
        b.status === 'constructing' || b.status === 'upgrading'
      );

      for (const building of constructingBuildings) {
        const newWeeksRemaining = building.construction_weeks_remaining - 1;

        if (newWeeksRemaining <= 0) {
          // Construction/upgrade complete
          await supabase
            .from('settlement_buildings')
            .update({
              status: 'active',
              construction_weeks_remaining: 0
            })
            .eq('id', building.id);

          const def = buildingDefinitions.find(d => d.building_type === building.building_type);
          notify(`${def?.name} construction complete!`);
        } else {
          await supabase
            .from('settlement_buildings')
            .update({
              construction_weeks_remaining: newWeeksRemaining
            })
            .eq('id', building.id);
        }
      }

      // Advance production cycle
      const newWeeksRemaining = cycleToUpdate.weeks_remaining - 1;

      if (newWeeksRemaining <= 0) {
        // Cycle complete - calculate production
        const activeProducers = buildings.filter(b =>
          b.status === 'active' &&
          buildingDefinitions.find(d => d.building_type === b.building_type)?.category === 'producer'
        );

        let totalProduction = 0;
        for (const building of activeProducers) {
          totalProduction += building.stats?.production || 0;
        }

        // Award BP
        await supabase
          .from('settlements')
          .update({
            build_points: selectedSettlement.build_points + totalProduction
          })
          .eq('id', selectedSettlement.id);

        // Complete cycle
        await supabase
          .from('production_cycles')
          .update({
            is_active: false,
            weeks_remaining: 0,
            total_production: totalProduction,
            completed_at: new Date().toISOString()
          })
          .eq('id', cycleToUpdate.id);

        // Start new cycle
        await supabase
          .from('production_cycles')
          .insert({
            settlement_id: selectedSettlement.id,
            cycle_number: cycleToUpdate.cycle_number + 1,
            weeks_remaining: 4,
            total_production: 0,
            is_active: true
          });

        notify(`Production cycle complete! Earned ${totalProduction.toFixed(1)} BP`);
      } else {
        await supabase
          .from('production_cycles')
          .update({
            weeks_remaining: newWeeksRemaining
          })
          .eq('id', cycleToUpdate.id);

        notify('Week advanced');
      }

      loadSettlements();
      loadBuildings();
      loadProductionCycle();
    } catch (error) {
      console.error('Error advancing week:', error);
      notify('Failed to advance week');
    }
  };

  const getBuildingIcon = (category) => {
    switch (category) {
      case 'producer': return TrendingUp;
      case 'facility': return Building2;
      default: return Building2;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading settlements...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Building2 size={28} />
          Settlement Management
        </h2>
        <button
          onClick={() => setShowNewSettlementModal(true)}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus size={18} />
          New Settlement
        </button>
      </div>

      {/* Settlement Selector */}
      {settlements.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {settlements.map(settlement => (
            <button
              key={settlement.id}
              onClick={() => setSelectedSettlement(settlement)}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                selectedSettlement?.id === settlement.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              {settlement.name}
            </button>
          ))}
        </div>
      )}

      {selectedSettlement ? (
        <>
          {/* Settlement Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Coins size={18} />
                <span className="text-sm">Build Points</span>
              </div>
              <div className="text-2xl font-bold text-cyan-400">
                {selectedSettlement.build_points?.toFixed(1) || 0}
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Users size={18} />
                <span className="text-sm">Population</span>
              </div>
              <div className="text-2xl font-bold">
                {selectedSettlement.population || 0}
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Hammer size={18} />
                <span className="text-sm">Labor Available</span>
              </div>
              <div className="text-2xl font-bold">
                {selectedSettlement.labor_available || 0}
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <ScrollText size={18} />
                <span className="text-sm">Production Cycle</span>
              </div>
              <div className="text-2xl font-bold">
                {productionCycle ? `${productionCycle.weeks_remaining}/4 weeks` : 'None'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowGoldTransferModal(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <Coins size={18} />
              Transfer Gold to BP
            </button>
            <button
              onClick={() => setShowBuyBPModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <Plus size={18} />
              Buy BP
            </button>
            <button
              onClick={() => setShowCashOutModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <Coins size={18} />
              Cash Out BP
            </button>
            <button
              onClick={advanceWeek}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <History size={18} />
              Advance Week
            </button>
          </div>

          {/* Buildings */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Buildings</h3>
              <button
                onClick={() => setShowBuyBuildingModal(true)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <Plus size={18} />
                Buy Building
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buildings.map(building => {
                const definition = buildingDefinitions.find(d => d.building_type === building.building_type);
                const Icon = getBuildingIcon(definition?.category);

                return (
                  <div key={building.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon size={20} className="text-cyan-400" />
                        <div>
                          <h4 className="font-bold">{definition?.name}</h4>
                          <p className="text-sm text-slate-400">Tier {building.tier}</p>
                        </div>
                      </div>
                      {building.status === 'active' && building.tier < definition?.max_tier && (
                        <button
                          onClick={() => upgradeBuilding(building)}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white px-2 py-1 rounded text-sm flex items-center gap-1"
                        >
                          <ArrowUp size={14} />
                          Upgrade
                        </button>
                      )}
                    </div>

                    {building.status !== 'active' && (
                      <div className="text-sm text-yellow-400 mb-2">
                        {building.status === 'constructing' ? 'Constructing' : 'Upgrading'}: {building.construction_weeks_remaining} weeks
                      </div>
                    )}

                    <div className="text-sm space-y-1">
                      {building.stats?.production && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Production:</span>
                          <span className="text-green-400">{building.stats.production} BP/cycle</span>
                        </div>
                      )}
                      {building.stats?.laborCost && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Labor Cost:</span>
                          <span>{building.stats.laborCost}</span>
                        </div>
                      )}
                      {definition?.category === 'facility' && Object.entries(building.stats || {}).map(([key, value]) => {
                        if (!['tier', 'bpCost', 'constructionWeeks', 'laborCost'].includes(key)) {
                          return (
                            <div key={key} className="flex justify-between">
                              <span className="text-slate-400 capitalize">{key}:</span>
                              <span className="text-cyan-400">+{value}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {buildings.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                No buildings yet. Purchase your first building to get started!
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-slate-400">
          No settlements yet. Create your first settlement to get started!
        </div>
      )}

      {/* Notification Toast */}
      {showNotification && (
        <div className="fixed bottom-4 right-4 bg-slate-800 border border-cyan-500 rounded-lg p-4 shadow-xl z-50 max-w-md">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-cyan-400 flex-shrink-0 mt-0.5" />
            <p className="text-white">{notificationMessage}</p>
          </div>
        </div>
      )}

      {/* New Settlement Modal */}
      {showNewSettlementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Create New Settlement</h3>
            <input
              type="text"
              value={newSettlementName}
              onChange={(e) => setNewSettlementName(e.target.value)}
              placeholder="Settlement name"
              className="w-full bg-slate-700 text-white rounded px-4 py-2 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && createSettlement()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewSettlementModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={createSettlement}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gold Transfer Modal */}
      {showGoldTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Transfer Gold to BP</h3>
            <p className="text-slate-400 mb-4">Convert party gold to Build Points at 500gp per BP</p>
            <input
              type="number"
              value={goldTransferAmount}
              onChange={(e) => setGoldTransferAmount(e.target.value)}
              placeholder="Gold amount"
              className="w-full bg-slate-700 text-white rounded px-4 py-2 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && transferGoldToBP()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowGoldTransferModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={transferGoldToBP}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buy BP Modal */}
      {showBuyBPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Buy Build Points</h3>
            <p className="text-slate-400 mb-4">Purchase BP at 500gp per BP</p>
            <input
              type="number"
              step="0.5"
              value={buyBPAmount}
              onChange={(e) => setBuyBPAmount(e.target.value)}
              placeholder="BP amount"
              className="w-full bg-slate-700 text-white rounded px-4 py-2 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && buyBP()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowBuyBPModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={buyBP}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Buy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Out BP Modal */}
      {showCashOutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Cash Out Build Points</h3>
            <p className="text-slate-400 mb-4">Convert BP to gold at 500gp per BP</p>
            <input
              type="number"
              step="0.5"
              value={cashOutAmount}
              onChange={(e) => setCashOutAmount(e.target.value)}
              placeholder="BP amount"
              className="w-full bg-slate-700 text-white rounded px-4 py-2 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && cashOutBP()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCashOutModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={cashOutBP}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
              >
                Cash Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buy Building Modal */}
      {showBuyBuildingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full border border-slate-700 my-8">
            <h3 className="text-xl font-bold mb-4">Purchase Building</h3>

            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {buildingDefinitions.map(def => {
                const tier1 = def.tier_data[0];
                const Icon = getBuildingIcon(def.category);

                return (
                  <div
                    key={def.id}
                    className="bg-slate-700 p-4 rounded-lg hover:bg-slate-600 cursor-pointer border border-slate-600"
                    onClick={() => buyBuilding(def.building_type)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon size={24} className="text-cyan-400 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold">{def.name}</h4>
                            <p className="text-sm text-slate-400">{def.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-cyan-400 font-bold">{tier1.bpCost} BP</div>
                            <div className="text-sm text-slate-400">{tier1.laborCost} Labor</div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm">
                          <span className="text-slate-400">{tier1.constructionWeeks} weeks</span>
                          {tier1.production && (
                            <span className="text-green-400">+{tier1.production} BP/cycle</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowBuyBuildingModal(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
