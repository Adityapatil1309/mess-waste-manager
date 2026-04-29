import { useState, useEffect } from 'react';
import API from '../api/axios';
import { deleteEntry } from '../api/apiHelpers';
import toast from 'react-hot-toast';
import { HiOutlineCube, HiOutlinePlus, HiOutlineExclamation, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineMinus } from 'react-icons/hi';

const CATEGORIES = ['general', 'grains', 'vegetables', 'dairy', 'liquids'];
const CATEGORY_LABELS = { general: '📦 General', grains: '🌾 Grains', vegetables: '🥬 Vegetables', dairy: '🧈 Dairy', liquids: '💧 Liquids' };
const SOLID_UNITS = ['kg', 'ton', 'sack'];
const LIQUID_UNITS = ['liter', 'ml'];

const defaultForm = { item_name: '', category: 'general', item_type: 'solid', quantity_kg: '', unit: 'kg', min_threshold: '10', daily_usage: '0', expiry_date: '' };

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [alerts, setAlerts] = useState({ low_stock: [], expiring_soon: [] });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [quickAction, setQuickAction] = useState(null);
  const [quickQty, setQuickQty] = useState('');
  const [runway, setRunway] = useState({}); // item_name -> { days_left, buy_by_date, expiry_warning, daily_consumption }

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setPageLoading(true);
    try {
      const [inv, alt] = await Promise.all([
        API.get('/inventory/').catch(() => ({ data: [] })),
        API.get('/inventory/alerts').catch(() => ({ data: { low_stock: [], expiring_soon: [] } }))
      ]);
      
      const invData = Array.isArray(inv.data) ? inv.data : [];
      setItems(invData);
      setAlerts(alt.data || { low_stock: [], expiring_soon: [] });

      // Load runway intelligence
      try {
        const proc = await API.get('/analytics/procurement-suggestions?days=7');
        const map = {};
        (proc.data?.suggestions || []).forEach(s => {
          if (s?.item) map[s.item.toLowerCase()] = s;
        });
        setRunway(map);
      } catch (e) { console.warn('Intelligence failed:', e); }
    } catch (err) { 
      console.error('Inventory load error:', err);
      toast.error('Could not refresh inventory list'); 
    } finally { 
      setPageLoading(false); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic frontend validation
    if (!form.item_name?.trim()) { toast.error('Item name is required'); return; }
    if (parseFloat(form.quantity_kg) < 0) { toast.error('Quantity cannot be negative'); return; }

    setLoading(true);
    try {
      const payload = {
        item_name: form.item_name.trim(),
        category: form.category || 'general',
        item_type: form.item_type || 'solid',
        quantity_kg: parseFloat(form.quantity_kg || 0),
        unit: form.unit || 'kg',
        min_threshold: parseFloat(form.min_threshold || 0),
        daily_usage: parseFloat(form.daily_usage || 0),
        expiry_date: form.expiry_date || null,
      };

      if (editId) {
        await API.put(`/inventory/${editId}`, payload);
        toast.success('Updated! ✅');
      } else {
        await API.post('/inventory/', payload);
        toast.success('Item added! 📦');
      }
      
      setShowForm(false);
      setEditId(null);
      setForm({ ...defaultForm });
      await loadData();
    } catch (err) { 
      const msg = err.response?.data?.detail;
      const errorMsg = typeof msg === 'string' ? msg : (Array.isArray(msg) ? msg[0]?.msg : 'Failed to save item');
      toast.error(errorMsg);
      console.error('Save error:', err);
    } finally { 
      setLoading(false); 
    }
  };

  const handleEdit = (item) => {
    if (!item) return;
    setEditId(item.id);
    setForm({ 
      item_name: item.item_name || '', 
      category: item.category || 'general', 
      item_type: item.item_type || 'solid', 
      quantity_kg: (item.quantity_kg || 0).toString(), 
      unit: item.unit || 'kg', 
      min_threshold: (item.min_threshold || 0).toString(), 
      daily_usage: (item.daily_usage || 0).toString(),
      expiry_date: item.expiry_date || '' 
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    deleteEntry('/inventory', id, setItems, 'Inventory item', loadData);
  };

  const handleQuickStock = async (itemId) => {
    const qty = parseFloat(quickQty);
    if (isNaN(qty) || qty <= 0) { toast.error('Enter a valid amount'); return; }
    
    const itemList = Array.isArray(items) ? items : [];
    const item = itemList.find(i => i.id === itemId);
    if (!item) return;

    const currentQty = item.quantity_kg || 0;
    const newQty = quickAction.type === 'add' ? currentQty + qty : Math.max(0, currentQty - qty);
    
    try {
      await API.put(`/inventory/${itemId}`, { quantity_kg: newQty });
      toast.success(quickAction.type === 'add' ? `Added ${qty} ${item.unit}` : `Reduced ${qty} ${item.unit}`);
      setQuickAction(null);
      setQuickQty('');
      loadData();
    } catch { 
      toast.error('Failed to update stock'); 
    }
  };

  // --- Status helpers ---
  const getStockStatus = (item) => {
    const qty = item?.quantity_kg || 0;
    const thresh = item?.min_threshold || 0;
    if (qty <= thresh * 0.5) return { label: 'Critical', color: 'bg-red-100 text-red-700', key: 'critical' };
    if (qty <= thresh) return { label: 'Low', color: 'bg-amber-100 text-amber-700', key: 'low' };
    
    // Daily Usage Check
    if (item.daily_usage > 0) {
      const daysLeft = qty / item.daily_usage;
      if (daysLeft <= 2) return { label: 'Running Out Soon', color: 'bg-orange-100 text-orange-700', key: 'urgent' };
    }

    return { label: 'Healthy', color: 'bg-green-100 text-green-700', key: 'healthy' };
  };

  const getExpiryInfo = (item) => {
    if (!item?.expiry_date) return { label: 'No expiry', color: 'text-gray-400', badge: null };
    const today = new Date(); today.setHours(0,0,0,0);
    const expiry = new Date(item.expiry_date); expiry.setHours(0,0,0,0);
    const diffMs = expiry - today;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`, color: 'text-red-600', badge: 'bg-red-100 text-red-700' };
    if (diffDays === 0) return { label: 'Expires today', color: 'text-red-600', badge: 'bg-red-100 text-red-700' };
    if (diffDays <= 3) return { label: `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`, color: 'text-red-500', badge: 'bg-red-100 text-red-600' };
    if (diffDays <= 7) return { label: `Expires in ${diffDays} days`, color: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' };
    return { label: 'Fresh', color: 'text-green-600', badge: 'bg-green-100 text-green-700' };
  };

  // Find runway info for an item by fuzzy matching item name against procurement keys
  const getRunwayInfo = (itemName) => {
    if (!itemName) return null;
    const name = itemName.toLowerCase();
    // Direct match
    if (runway[name]) return runway[name];
    // Partial match
    for (const [key, val] of Object.entries(runway)) {
      if (name.includes(key) || key.includes(name)) return val;
      const words = name.split(' ');
      const keyWords = key.replace(/[()]/g, '').split(' ');
      if (words.some(w => w.length >= 3 && keyWords.includes(w))) return val;
    }
    return null;
  };

  // --- Filtering ---
  const filteredItems = (items || []).filter(item => {
    if (search && !item?.item_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== 'all' && (item?.category || 'general') !== filterCategory) return false;
    if (filterStatus !== 'all' && getStockStatus(item).key !== filterStatus) return false;
    return true;
  });

  // --- Mini analytics ---
  const safeItems = Array.isArray(items) ? items : [];
  const totalItems = safeItems.length;
  const lowStockCount = safeItems.filter(i => (i.quantity_kg || 0) <= (i.min_threshold || 0)).length;
  const expiringCount = safeItems.filter(i => {
    if (!i.expiry_date) return false;
    const diff = Math.round((new Date(i.expiry_date) - new Date()) / (1000*60*60*24));
    return diff <= 7;
  }).length;

  // --- Render logic for Decision Cards ---
  const urgentItems = safeItems.filter(i => {
    const ri = getRunwayInfo(i.item_name);
    const exp = getExpiryInfo(i);
    return (ri && ri.days_left <= 2) || (exp.label || '').includes('Expired') || (i.quantity_kg || 0) <= (i.min_threshold || 0) * 0.5;
  });
  const attentionItems = safeItems.filter(i => {
    const ri = getRunwayInfo(i.item_name);
    const exp = getExpiryInfo(i);
    const isUrgent = (ri && ri.days_left <= 2) || (exp.label || '').includes('Expired') || (i.quantity_kg || 0) <= (i.min_threshold || 0) * 0.5;
    if (isUrgent) return false;
    return (ri && ri.days_left <= 5) || (exp.label || '').includes('Expires in') || (i.quantity_kg || 0) <= (i.min_threshold || 0);
  });
  const safeItemsCount = totalItems - urgentItems.length - attentionItems.length;

  // --- Render logic for Action Panel ---
  const toBuy = safeItems.filter(i => {
    const ri = getRunwayInfo(i.item_name);
    return ri && ri.days_left <= 2;
  });
  const toUse = safeItems.filter(i => {
    const exp = getExpiryInfo(i);
    const lbl = exp.label || '';
    return lbl.includes('Expired') || lbl.includes('Expires in 1') || lbl.includes('today');
  });

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineCube className="text-purple-500" /> Inventory Management
          </h1>
          <p className="text-gray-500 mt-1">Manage stock levels, categories, and track expiry dates</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...defaultForm }); }}
          className="btn-primary flex items-center gap-2" id="add-inventory">
          <HiOutlinePlus /> Add Item
        </button>
      </div>

      {/* Manager Decision Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 border-l-4 border-red-500 bg-red-50/30">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest">🚨 Urgent Actions</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{urgentItems.length}</p>
          <p className="text-xs text-red-600 font-medium mt-1">Requires immediate attention</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-amber-500 bg-amber-50/30">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">⚠️ Needs Attention</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{attentionItems.length}</p>
          <p className="text-xs text-amber-600 font-medium mt-1">Plan for next 2-3 days</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-green-500 bg-green-50/30">
          <p className="text-xs font-bold text-green-600 uppercase tracking-widest">✅ Safe Items</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{safeItemsCount}</p>
          <p className="text-xs text-green-600 font-medium mt-1">Stock levels healthy</p>
        </div>
      </div>

      {/* Action Required Today Panel */}
      {(toBuy.length > 0 || toUse.length > 0) && (
        <div className="glass-card p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white border-none shadow-xl">
           <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <HiOutlineExclamation className="text-amber-400" /> Action Required Today
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {toBuy.length > 0 && (
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                  <p className="text-xs font-bold text-amber-400 uppercase mb-3">🛒 Items to Procure</p>
                  <div className="space-y-2">
                    {toBuy.slice(0, 3).map(i => (
                      <div key={i.id} className="flex justify-between items-center text-sm">
                        <span>{i.item_name}</span>
                        <span className="text-red-400 font-bold">Out soon</span>
                      </div>
                    ))}
                    {toBuy.length > 3 && <p className="text-[10px] opacity-50">+{toBuy.length - 3} more items...</p>}
                  </div>
                  <button onClick={() => window.location.href='/procurement'} className="mt-4 w-full py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors">Go to Procurement</button>
                </div>
              )}
              {toUse.length > 0 && (
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                  <p className="text-xs font-bold text-primary-400 uppercase mb-3">🍱 Items to Use First</p>
                  <div className="space-y-2">
                    {toUse.slice(0, 3).map(i => (
                      <div key={i.id} className="flex justify-between items-center text-sm">
                        <span>{i.item_name}</span>
                        <span className="text-primary-400 font-bold">Expiring</span>
                      </div>
                    ))}
                    {toUse.length > 3 && <p className="text-[10px] opacity-50">+{toUse.length - 3} more items...</p>}
                  </div>
                  <button onClick={() => window.location.href='/food-cooking'} className="mt-4 w-full py-2 bg-primary-500 text-white rounded-xl text-xs font-bold hover:bg-primary-600 transition-colors">Plan Cooking</button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search items (e.g. Rice, Milk)..." value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-10 w-full" />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-field">
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field">
            <option value="all">All Status</option>
            <option value="healthy">🟢 Safe Stock</option>
            <option value="low">🟡 Low Stock</option>
            <option value="critical">🔴 Urgent</option>
          </select>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="glass-card p-6 animate-slide-up border-2 border-primary-200">
          <h3 className="font-bold text-gray-800 mb-4">{editId ? '📝 Update Item Details' : '📦 Register New Item'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {!editId && (
              <input type="text" placeholder="Item name" value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })} className="input-field" required />
            )}
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field">
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
            <select value={form.item_type} onChange={(e) => {
              const type = e.target.value;
              setForm({ ...form, item_type: type, unit: type === 'solid' ? 'kg' : 'liter' });
            }} className="input-field">
              <option value="solid">Solid Item</option>
              <option value="liquid">Liquid Item</option>
            </select>
            <div className="flex gap-2">
              <input type="number" step="0.1" placeholder="Initial Qty" value={form.quantity_kg}
                onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })} className="input-field w-2/3" required />
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input-field w-1/3">
                {(form.item_type === 'solid' ? SOLID_UNITS : LIQUID_UNITS).map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Min. Alert Level</label>
              <input type="number" step="0.1" placeholder="e.g. 10" value={form.min_threshold}
                onChange={(e) => setForm({ ...form, min_threshold: e.target.value })} className="input-field" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Daily Usage ({form.unit}/day)</label>
              <input type="number" step="0.1" placeholder="e.g. 5.5" value={form.daily_usage}
                onChange={(e) => setForm({ ...form, daily_usage: e.target.value })} className="input-field" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Expiry Date</label>
              <input type="date" value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="input-field" />
            </div>
            <div className="flex gap-2 lg:col-span-2">
              <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50 flex-1 py-3 font-bold">
                {loading ? 'Processing...' : editId ? 'Save Changes' : 'Confirm & Add'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm({ ...defaultForm }); }}
                className="px-6 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-semibold">Discard</button>
            </div>
          </form>
        </div>
      )}

      {/* Actionable Inventory Decisions */}
      <div className="space-y-8">
        {/* 1. Critical Actions Center */}
        {(() => {
          const buyItems = filteredItems.filter(i => {
             const ri = getRunwayInfo(i.item_name);
             return (ri && ri.action === "BUY NOW") || i.quantity_kg <= i.min_threshold;
          });
          const useItems = filteredItems.filter(i => {
             const exp = getExpiryInfo(i);
             return exp.label.includes('Expired') || exp.label.includes('Expires in 1') || exp.label.includes('today');
          });

          if (buyItems.length === 0 && useItems.length === 0) return (
            <div className="glass-card p-8 text-center bg-green-50/30 border-green-100">
               <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✅</span>
               </div>
               <h3 className="text-xl font-bold text-gray-900">All Systems Normal</h3>
               <p className="text-gray-500">Stock levels are healthy and no immediate actions are required.</p>
            </div>
          );

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="glass-card p-6 border-l-8 border-red-500 bg-red-50/20">
                  <h3 className="text-lg font-black text-red-700 flex items-center gap-2 mb-4">
                     🛒 BUY NOW ({buyItems.length})
                  </h3>
                  <div className="space-y-3">
                     {buyItems.slice(0, 3).map(i => (
                        <div key={i.id} className="flex justify-between items-center bg-white/60 p-3 rounded-xl border border-red-100">
                           <span className="font-bold text-gray-800">{i.item_name}</span>
                           <span className="text-xs font-black text-red-600 bg-red-100 px-2 py-1 rounded uppercase tracking-tighter">Out of Stock</span>
                        </div>
                     ))}
                     <button onClick={() => window.location.href='/procurement'} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100">Create Purchase List</button>
                  </div>
               </div>

               <div className="glass-card p-6 border-l-8 border-amber-500 bg-amber-50/20">
                  <h3 className="text-lg font-black text-amber-700 flex items-center gap-2 mb-4">
                     🍱 USE TODAY ({useItems.length})
                  </h3>
                  <div className="space-y-3">
                     {useItems.slice(0, 3).map(i => (
                        <div key={i.id} className="flex justify-between items-center bg-white/60 p-3 rounded-xl border border-amber-100">
                           <span className="font-bold text-gray-800">{i.item_name}</span>
                           <span className="text-xs font-black text-amber-600 bg-amber-100 px-2 py-1 rounded uppercase tracking-tighter">Expiring</span>
                        </div>
                     ))}
                     <button onClick={() => window.location.href='/food-cooking'} className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-100">Adjust Menu</button>
                  </div>
               </div>
            </div>
          );
        })()}

        {/* 2. Full Inventory Intelligence */}
        <div>
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Manager's Decision Dashboard</h2>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Showing:</span>
                 <span className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full border border-primary-100">{filteredItems.length} Items</span>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => {
                const status = getStockStatus(item);
                const expiry = getExpiryInfo(item);
                const ri = getRunwayInfo(item.item_name);
                
                // --- Simple Action Engine Mapping ---
                let decision = { label: 'NO ACTION', color: 'text-gray-400', icon: '✅', badge: 'bg-gray-100' };
                if (ri && ri.action === "BUY NOW") decision = { label: 'BUY NOW', color: 'text-red-600', icon: '🛒', badge: 'bg-red-100' };
                else if (ri && ri.action === "PLAN PURCHASE") decision = { label: 'PLAN BUY', color: 'text-amber-500', icon: '⚠️', badge: 'bg-amber-100' };
                
                if (expiry.label.includes('Expired') || expiry.label.includes('today') || expiry.label.includes('in 1') || (ri && ri.action === "USE TODAY")) {
                   decision = { label: 'USE TODAY', color: 'text-amber-600', icon: '🍱', badge: 'bg-amber-100' };
                }

                if (item.daily_usage > 0 && (item.quantity_kg / item.daily_usage) <= 2 && decision.label === 'NO ACTION') {
                   decision = { label: 'RESTOCK SOON', color: 'text-orange-600', icon: '🛒', badge: 'bg-orange-100' };
                }

                return (
                  <div key={item.id} className="glass-card-premium p-6 flex flex-col hover:shadow-2xl transition-all border-t-4 border-t-transparent hover:border-t-primary-500 group relative">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-5 relative">
                      <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">{item.item_name}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{CATEGORY_LABELS[item.category] || item.category}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEdit(item)} className="p-2 hover:bg-primary-50 text-primary-400 rounded-xl transition-all shadow-sm bg-white border border-gray-100"><HiOutlinePencil size={18} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-50 text-red-400 rounded-xl transition-all shadow-sm bg-white border border-gray-100"><HiOutlineTrash size={18} /></button>
                      </div>
                    </div>

                    {/* Stock & Runway */}
                    <div className="bg-gray-50/50 rounded-2xl p-4 mb-5 border border-gray-100 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">In Stock</p>
                        <p className="text-2xl font-black text-gray-900">{item.quantity_kg} <span className="text-xs font-bold text-gray-400">{item.unit}</span></p>
                        <p className="text-[10px] text-gray-400 font-medium mt-1">Usage: {item.daily_usage || 0} {item.unit}/day</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Lasts For</p>
                        <p className={`text-2xl font-black ${((item.daily_usage > 0 && (item.quantity_kg / item.daily_usage) <= 3) || (ri && ri.days_left <= 3)) ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
                          {item.daily_usage > 0 
                            ? `${Math.floor(item.quantity_kg / item.daily_usage)}d` 
                            : (ri && ri.days_left !== null ? `${ri.days_left}d` : '--')}
                        </p>
                        {item.daily_usage > 0 && <p className="text-[10px] text-gray-400 font-medium mt-1">Based on usage</p>}
                      </div>
                    </div>

                    {/* Simple Action Label */}
                    <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-5">
                       <div className="flex flex-col">
                          <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded ${decision.badge} ${decision.color} w-fit`}>
                             {decision.icon} {decision.label}
                          </span>
                          <span className={`text-[10px] font-bold text-gray-400 mt-2`}>{expiry.label}</span>
                       </div>

                       <div className="flex gap-2">
                          <button onClick={() => { setQuickAction({ id: item.id, type: 'add' }); setQuickQty(''); }} 
                            className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center hover:bg-primary-600 hover:text-white transition-all shadow-sm active:scale-95">
                            <HiOutlinePlus size={22} />
                          </button>
                          <button onClick={() => { setQuickAction({ id: item.id, type: 'reduce' }); setQuickQty(''); }} 
                            className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all shadow-sm active:scale-95">
                            <HiOutlineMinus size={22} />
                          </button>
                       </div>
                    </div>

                    {/* Quick Input Overlay */}
                    {quickAction && quickAction.id === item.id && (
                      <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 rounded-3xl animate-fade-in">
                         <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{quickAction.type === 'add' ? 'Increasing' : 'Reducing'} {item.item_name}</p>
                         <div className="flex items-center gap-2 mb-4">
                            <input type="number" step="0.1" value={quickQty} onChange={e => setQuickQty(e.target.value)}
                               className="w-24 text-center text-2xl font-black bg-gray-100 border-none rounded-2xl p-3 focus:ring-2 focus:ring-primary-500" placeholder="0.0" autoFocus />
                            <span className="font-bold text-gray-400">{item.unit}</span>
                         </div>
                         <div className="flex gap-2 w-full">
                            <button onClick={() => handleQuickStock(item.id)} className="btn-primary flex-1 py-3 font-bold">Apply</button>
                            <button onClick={() => { setQuickAction(null); setQuickQty(''); }} className="px-6 py-3 bg-gray-200 text-gray-600 rounded-2xl font-bold">Cancel</button>
                         </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredItems.length === 0 && (
                <div className="col-span-full py-20 text-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                   <HiOutlineCube className="text-gray-200 text-6xl mx-auto mb-4" />
                   <p className="text-gray-400 font-bold text-lg">No Inventory Found</p>
                   <p className="text-gray-400 text-sm">Add your first item above to start tracking stock.</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
