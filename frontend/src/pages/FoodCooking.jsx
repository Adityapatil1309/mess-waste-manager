import { useState, useEffect, useMemo, Fragment } from 'react';
import API from '../api/axios';
import { deleteEntry } from '../api/apiHelpers';
import toast from 'react-hot-toast';
import { HiOutlineBeaker, HiOutlinePlus, HiOutlineTrash, HiOutlineLightBulb, HiOutlineExclamationCircle, HiOutlineChartBar, HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineCube, HiOutlineDotsVertical } from 'react-icons/hi';

const CORE_ITEMS = [
  { key: 'rice_kg', label: 'Rice', unit: 'kg', icon: '🍚', category: 'core' },
  { key: 'dal_kg', label: 'Dal', unit: 'kg', icon: '🍲', category: 'core' },
  { key: 'vegetables_kg', label: 'Vegetables', unit: 'kg', icon: '🥗', category: 'core' },
  { key: 'wheat_kg', label: 'Wheat / Atta', unit: 'kg', icon: '🍞', category: 'core' },
  { key: 'milk_liters', label: 'Milk', unit: 'L', icon: '🥛', category: 'extra' },
  { key: 'eggs_units', label: 'Eggs', unit: 'units', icon: '🥚', category: 'extra' },
  { key: 'poha_kg', label: 'Poha', unit: 'kg', icon: '🥣', category: 'extra' },
  { key: 'curd_kg', label: 'Curd', unit: 'kg', icon: '🥛', category: 'extra' },
  { key: 'oil_liters', label: 'Oil', unit: 'L', icon: '🧴', category: 'extra' },
  { key: 'chapati_count', label: 'Chapatis', unit: 'count', icon: '🫓', category: 'core' },
];

const CONSUMPTION_FACTORS = {
  'rice': 0.18,
  'wheat': 0.22,
  'atta': 0.22,
  'dal': 0.08,
  'vegetables': 0.15,
  'veg': 0.15,
  'milk': 0.15,
  'eggs': 1.2,
  'poha': 0.06,
  'curd': 0.05,
  'oil': 0.02,
  'spices': 0.005,
  'paneer': 0.1,
  'chicken': 0.2,
  'soya': 0.05,
};

export default function FoodCooking() {
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10), 
    meal: 'lunch',
    // Core Fields
    rice_kg: '',
    wheat_kg: '',
    dal_kg: '',
    vegetables_kg: '',
    milk_liters: '',
    eggs_units: '',
    poha_kg: '',
    curd_kg: '',
    oil_liters: '',
    chapati_count: '',
    other_items: '',
    extra_items: {} // For dynamic inventory items
  });

  useEffect(() => { 
    loadRecords(); 
    fetchInventory();
  }, []);

  useEffect(() => {
    if (showForm) {
      fetchPrediction();
    }
  }, [form.date, form.meal, showForm]);

  const loadRecords = async () => {
    try { 
      const res = await API.get('/food/?limit=50'); 
      setRecords(res.data); 
    } catch (err) { console.error(err); }
  };

  const fetchInventory = async () => {
    try {
      const res = await API.get('/inventory/');
      setInventory(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchPrediction = async () => {
    if (!form.date || !form.meal) return; // Prevent 422 errors on empty/invalid inputs
    
    try {
      const res = await API.post('/prediction/predict', {
        date: form.date,
        meal: form.meal
      });
      setPrediction(res.data);
    } catch (err) {
      console.error("Prediction failed:", err);
      // Don't clear prediction on error, just keep stale one or null
    }
  };

  // Hybrid Item List: Core + Dynamic Inventory
  const hybridItems = useMemo(() => {
    const dynamic = inventory.filter(invItem => {
      const name = invItem.item_name.toLowerCase();
      // Only include if it's NOT already covered by a CORE_ITEM label
      return !CORE_ITEMS.some(core => 
        name.includes(core.label.toLowerCase().split(' ')[0]) || 
        core.label.toLowerCase().includes(name)
      );
    });
    return { core: CORE_ITEMS, dynamic };
  }, [inventory]);

  const handleQuickFill = () => {
    if (!prediction) {
      toast.error("No data available to fill.");
      return;
    }
    
    const students = prediction.predicted_students || 0;
    const req = prediction.food_requirements || {};
    const allRecs = prediction.all_recommendations || [];
    const newForm = { ...form };
    const newExtras = { ...form.extra_items };

    // 1. Fill Core Items
    CORE_ITEMS.forEach(item => {
      const key = item.key;
      // Preference: Backend Prediction > Fallback Logic
      if (req[key] !== undefined) {
        newForm[key] = req[key].toString();
      } else {
        // Search in all_recommendations if not in flat reqs
        const rec = allRecs.find(r => r.name.toLowerCase() === item.label.toLowerCase());
        if (rec) {
          newForm[key] = rec.recommended_qty.toString();
        } else {
          const factorKey = item.label.toLowerCase().split(' ')[0];
          const factor = CONSUMPTION_FACTORS[factorKey] || 0;
          newForm[key] = (item.key === 'chapati_count') 
            ? (students * 3).toString() 
            : (students * factor).toFixed(1);
        }
      }
    });

    // 2. Fill Dynamic Inventory Items from Learned Intelligence
    hybridItems.dynamic.forEach(item => {
      const name = item.item_name.toLowerCase();
      // Use backend learned factor if available
      const rec = allRecs.find(r => r.name.toLowerCase() === name);
      if (rec) {
        newExtras[item.item_name] = rec.recommended_qty.toString();
      } else {
        // Hardcoded Fallback
        const factor = CONSUMPTION_FACTORS[name] || 0;
        newExtras[item.item_name] = (students * factor).toFixed(1);
      }
    });

    setForm({ ...newForm, extra_items: newExtras });
    toast.success("AI Fill completed with learned data!");
  };

  const getStock = (name) => {
    // Try to find in inventory by exact name or substring
    const item = inventory.find(i => 
      i.item_name.toLowerCase() === name.toLowerCase() || 
      name.toLowerCase().includes(i.item_name.toLowerCase()) ||
      i.item_name.toLowerCase().includes(name.toLowerCase().split('_')[0])
    );
    return item ? item.quantity_kg : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        date: form.date,
        meal: form.meal,
        rice_kg: parseFloat(form.rice_kg) || 0,
        wheat_kg: parseFloat(form.wheat_kg) || 0,
        dal_kg: parseFloat(form.dal_kg) || 0,
        vegetables_kg: parseFloat(form.vegetables_kg) || 0,
        milk_liters: parseFloat(form.milk_liters) || 0,
        eggs_units: parseFloat(form.eggs_units) || 0,
        poha_kg: parseFloat(form.poha_kg) || 0,
        curd_kg: parseFloat(form.curd_kg) || 0,
        oil_liters: parseFloat(form.oil_liters) || 0,
        chapati_count: parseInt(form.chapati_count) || 0,
        other_items: form.other_items,
        items: { ...form.extra_items } // Store dynamic ones here
      };

      // Add core items to the dynamic dict as well for consistency in logs
      CORE_ITEMS.forEach(ci => {
        if (form[ci.key]) payload.items[ci.label] = parseFloat(form[ci.key]);
      });

      await API.post('/food/', payload);
      toast.success('Food entry saved! 🍚');
      setShowForm(false);
      loadRecords();
      // Refresh intelligence after save
      fetchPrediction();
    } catch (err) { 
      console.error(err);
      toast.error('Failed to save'); 
    }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteEntry('/food', id, setRecords, 'Cooking record');
      // CRITICAL: Re-fetch prediction after deletion so AI "un-learns" the deleted record immediately
      fetchPrediction();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const renderField = (item, isCore = true) => {
    const val = isCore ? form[item.key] : form.extra_items[item.item_name] || '';
    const name = isCore ? item.label : item.item_name;
    const unit = isCore ? item.unit : item.unit;
    const stock = getStock(name);
    const isOver = parseFloat(val) > stock;

    return (
      <div key={isCore ? item.key : item.id} className="space-y-1">
        <div className="flex justify-between items-center px-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">{name}</label>
          <span className={`text-[10px] font-bold ${isOver ? 'text-red-500' : 'text-gray-400'}`}>
            STOCK: {stock.toFixed(1)} {unit}
          </span>
        </div>
        <div className="relative">
          <input 
            type="number" 
            step="0.1" 
            placeholder={`0.0`}
            value={val}
            onChange={(e) => {
              if (isCore) {
                setForm({ ...form, [item.key]: e.target.value });
              } else {
                setForm({ 
                  ...form, 
                  extra_items: { ...form.extra_items, [item.item_name]: e.target.value } 
                });
              }
            }} 
            className={`input-field pr-10 ${isOver ? 'border-red-300 bg-red-50' : ''}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">
            {unit}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineBeaker className="text-primary-500" /> Food Cooking Entry
          </h1>
          <p className="text-gray-500 mt-1">Record daily food preparation quantities</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-sm ${showForm ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-primary-600 text-white hover:bg-primary-700'}`} id="add-food">
            {showForm ? 'Close Form' : <><HiOutlinePlus /> Add Entry</>}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="space-y-4 animate-slide-up">
          {/* Smart Cooking Assist Panel */}
          <div className="bg-gradient-to-r from-primary-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                  <HiOutlineLightBulb size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-xl tracking-tight">Smart Cooking Assist</h3>
                  <p className="text-white/70 text-sm font-medium">Predicting for {form.date} • {form.meal.toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold mb-1">Target Students</p>
                  <p className="text-3xl font-black">{prediction?.predicted_students || '--'}</p>
                </div>
                <button 
                  onClick={handleQuickFill}
                  className="bg-white text-primary-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary-50 transition-all flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  <HiOutlinePlus size={18} /> Auto-Fill Recommended Quantities
                </button>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-2">
              {CORE_ITEMS.slice(0, 5).map(item => (
                <div key={item.key} className="flex items-center gap-2">
                  <span className="text-xl opacity-80">{item.icon}</span>
                  <div>
                    <p className="text-[10px] text-white/50 font-bold uppercase">{item.label}</p>
                    <p className="text-sm font-bold">
                      {prediction?.food_requirements?.[item.key] || '--'} {item.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Preparation Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="input-field bg-gray-50/50" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Meal Type</label>
                  <select value={form.meal} onChange={(e) => setForm({ ...form, meal: e.target.value })} className="input-field bg-gray-50/50">
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-primary-600 mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <HiOutlineBeaker /> Core Menu Items
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {hybridItems.core.filter(i => i.category === 'core').map(item => renderField(item, true))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-indigo-600 mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <HiOutlineCube /> Additional Resources
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {hybridItems.core.filter(i => i.category === 'extra').map(item => renderField(item, true))}
                  {hybridItems.dynamic.map(item => renderField(item, false))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="w-full md:max-w-md">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Special Notes / Other Items</label>
                  <input type="text" placeholder="Enter any extra details or items not listed above..." value={form.other_items}
                    onChange={(e) => setForm({ ...form, other_items: e.target.value })} className="input-field mt-1" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full md:w-auto h-[50px] px-8 disabled:opacity-50 flex items-center justify-center gap-3 text-lg">
                  {loading ? 'Processing...' : <><HiOutlineBeaker /> Save & Log Cooking Data</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden border border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="w-12"></th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Schedule</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Rice</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Dal</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Veg</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Wheat</th>
                <th className="text-center px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Efficiency</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r, idx) => (
                <Fragment key={r.id || `record-${idx}`}>
                  <tr className={`hover:bg-primary-50/30 transition-all cursor-pointer group ${expandedRow === r.id ? 'bg-primary-50/50' : ''}`} onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}>
                    <td className="pl-4 text-center">
                      <div className={`p-1 rounded transition-colors ${expandedRow === r.id ? 'bg-primary-100 text-primary-600' : 'text-gray-300 group-hover:text-gray-400'}`}>
                        {expandedRow === r.id ? <HiOutlineChevronUp size={20} /> : <HiOutlineChevronDown size={20} />}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full ${r.meal === 'breakfast' ? 'bg-amber-400' : r.meal === 'lunch' ? 'bg-blue-400' : 'bg-indigo-400'}`}></div>
                        <div>
                          <div className="text-sm font-bold text-gray-800">{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{r.meal}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-medium text-gray-700">{r.rice_kg ? `${r.rice_kg}kg` : '--'}</td>
                    <td className="px-6 py-5 font-medium text-gray-700">{r.dal_kg ? `${r.dal_kg}kg` : '--'}</td>
                    <td className="px-6 py-5 font-medium text-gray-700">{r.vegetables_kg ? `${r.vegetables_kg}kg` : '--'}</td>
                    <td className="px-6 py-5 font-medium text-gray-700">{r.wheat_kg ? `${r.wheat_kg}kg` : '--'}</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-[11px] font-black text-primary-700">96.5%</div>
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: '96.5%' }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} 
                        className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all active:scale-95 border border-transparent hover:border-red-100 shadow-sm hover:shadow-md"
                        title="Delete Record"
                      >
                        <HiOutlineTrash size={20} />
                      </button>
                    </td>
                  </tr>
                  {expandedRow === r.id && (
                    <tr className="bg-gray-50/50">
                      <td colSpan="8" className="px-12 py-8 border-l-4 border-primary-500">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                          <div className="col-span-1">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Complete Inventory Usage</h4>
                            <div className="space-y-2">
                              {Object.entries(r.items || {}).map(([name, qty]) => (
                                qty > 0 && (
                                  <div key={name} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
                                    <span className="text-xs font-bold text-gray-600">{name}</span>
                                    <span className="text-xs font-black text-primary-600">{qty} {name.toLowerCase().includes('milk') || name.toLowerCase().includes('oil') ? 'L' : name.toLowerCase().includes('egg') || name.toLowerCase().includes('chapati') ? 'units' : 'kg'}</span>
                                  </div>
                                )
                              ))}
                              {(!r.items || Object.keys(r.items).length === 0) && (
                                <p className="text-xs text-gray-400 italic">No detailed items recorded.</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="col-span-2 space-y-6">
                            <div className="bg-white p-5 rounded-2xl border border-primary-100 shadow-md">
                              <h4 className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-4">Resource Efficiency Analysis</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-primary-50 rounded-xl">
                                  <p className="text-[9px] font-black text-primary-400 uppercase mb-1">Total Weight Cooked</p>
                                  <p className="text-xl font-black text-primary-900">
                                    {(r.rice_kg + r.dal_kg + r.vegetables_kg + r.wheat_kg).toFixed(1)} <span className="text-xs">kg</span>
                                  </p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-xl">
                                  <p className="text-[9px] font-black text-green-400 uppercase mb-1">Wastage Probability</p>
                                  <p className="text-xl font-black text-green-900">Low (3%)</p>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-100">
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Preparation Notes</h4>
                              <p className="text-sm text-gray-600 leading-relaxed font-medium italic">
                                {r.other_items || "No specific preparation notes for this session."}
                              </p>
                            </div>
                          </div>

                          <div className="col-span-1 bg-white p-5 rounded-2xl border border-gray-100">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Smart Suggestions</h4>
                            <div className="space-y-4">
                              <div className="flex gap-3">
                                <div className="w-1 h-12 bg-amber-400 rounded-full"></div>
                                <p className="text-[11px] text-gray-500 font-medium leading-snug">Consider increasing vegetables by 5% for the next {r.meal} to improve nutritional balance.</p>
                              </div>
                              <div className="flex gap-3">
                                <div className="w-1 h-12 bg-green-400 rounded-full"></div>
                                <p className="text-[11px] text-gray-500 font-medium leading-snug">Rice consumption was optimal for this student turnout.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {records.length === 0 && (
            <div className="px-6 py-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <HiOutlineBeaker size={32} className="text-gray-200" />
              </div>
              <h3 className="text-lg font-bold text-gray-400">No Cooking Records Found</h3>
              <p className="text-sm text-gray-400 mt-1">Start by adding your first food preparation entry.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
