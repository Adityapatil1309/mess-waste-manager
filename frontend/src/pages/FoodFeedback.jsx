import { useState, useEffect } from 'react';
import API from '../api/axios';
import { deleteEntry } from '../api/apiHelpers';
import toast from 'react-hot-toast';
import { HiOutlineStar, HiStar } from 'react-icons/hi';

export default function FoodFeedback() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    meal: 'lunch',
    food_item: '',
    rating: 5,
    comment: ''
  });

  const meals = ['breakfast', 'lunch', 'dinner'];
  const commonFoodItems = [
    'Dal (Lentils)',
    'Rice',
    'Chapati/Roti',
    'Vegetables',
    'Curry',
    'Curd',
    'Pickle',
    'Salad',
    'Soup',
    'Sweet Dish',
    'Other'
  ];

  useEffect(() => { loadFeedback(); }, []);

  const loadFeedback = async () => {
    try {
      const res = await API.get('/food-feedback/?limit=50');
      setFeedbackList(res.data);
    } catch (err) { 
      console.error('Failed to load feedback:', err); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.food_item.trim()) {
      toast.error('Please enter a food item name');
      return;
    }
    
    setSubmitting(true);
    try {
      await API.post('/food-feedback/', {
        ...form,
        food_item: form.food_item === 'Other' ? form.customFoodItem : form.food_item
      });
      toast.success('Feedback submitted! 🍽️');
      setShowForm(false);
      setForm({
        date: new Date().toISOString().slice(0, 10),
        meal: 'lunch',
        food_item: '',
        rating: 5,
        comment: ''
      });
      loadFeedback();
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Failed to submit feedback'); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleDelete = (id) => {
    deleteEntry('/food-feedback', id, setFeedbackList, 'Feedback');
  };

  const StarRating = ({ rating, setRating, readonly = false }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && setRating(star)}
          className={`text-2xl transition-transform ${!readonly && 'hover:scale-110'} ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
        >
          {star <= rating ? <HiStar /> : <HiOutlineStar />}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineStar className="text-yellow-500" /> Food Feedback
          </h1>
          <p className="text-gray-500 mt-1">Rate your meal experience</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="btn-primary flex items-center gap-2"
          id="add-feedback"
        >
          <HiOutlineStar /> Add Feedback
        </button>
      </div>

      {/* Feedback Form */}
      {showForm && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Submit New Feedback</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meal</label>
                <select
                  value={form.meal}
                  onChange={(e) => setForm({ ...form, meal: e.target.value })}
                  className="input-field"
                >
                  {meals.map(m => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Food Item</label>
                <select
                  value={form.food_item}
                  onChange={(e) => setForm({ ...form, food_item: e.target.value, customFoodItem: '' })}
                  className="input-field"
                >
                  <option value="">Select food item</option>
                  {commonFoodItems.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {form.food_item === 'Other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specify Food Item</label>
                <input
                  type="text"
                  value={form.customFoodItem || ''}
                  onChange={(e) => setForm({ ...form, customFoodItem: e.target.value })}
                  placeholder="Enter food item name"
                  className="input-field"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <StarRating rating={form.rating} setRating={(r) => setForm({ ...form, rating: r })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comment (Optional)</label>
              <textarea
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Any specific feedback about this item?"
                className="input-field"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-outline"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Summary */}
      {feedbackList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="text-sm text-gray-500">Total Feedback</p>
            <p className="text-2xl font-bold text-gray-800">{feedbackList.length}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-sm text-gray-500">Average Rating</p>
            <p className="text-2xl font-bold text-yellow-600">
              {(feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length).toFixed(1)}
            </p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-sm text-gray-500">Recent Meal</p>
            <p className="text-lg font-semibold text-gray-800 capitalize">
              {feedbackList[0]?.meal || '-'}
            </p>
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Date</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Meal</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Food Item</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Rating</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Comment</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {feedbackList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No feedback submitted yet. Be the first to rate your meal!
                  </td>
                </tr>
              ) : (
                feedbackList.map((fb) => (
                  <tr key={fb.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm text-gray-900">{fb.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{fb.meal}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{fb.food_item}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={star <= fb.rating ? 'text-yellow-400' : 'text-gray-200'}>
                            <HiStar className="w-4 h-4" />
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {fb.comment || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(fb.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}