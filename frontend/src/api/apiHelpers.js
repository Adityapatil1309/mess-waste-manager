import API from './axios';
import toast from 'react-hot-toast';

/**
 * Standardized delete function for API resources
 * @param {string} endpoint - The API endpoint (e.g., '/inventory', '/food')
 * @param {number|string} id - The ID of the item to delete
 * @param {Function} setter - React state setter function for the list
 * @param {string} label - Label for the toast message (e.g., 'Item', 'Record')
 */
export const deleteEntry = async (endpoint, id, setter, label = 'Item', onSuccess = null) => {
  console.log(`[deleteEntry] Called for ${label} with ID:`, id);

  if (!id && id !== 0) {
    console.error(`[deleteEntry] Cannot delete ${label}: ID is missing`);
    toast.error(`Error: ${label} ID is missing`);
    return;
  }

  // Temporary removal of window.confirm to bypass potential blocking
  // const confirmDelete = window.confirm(`Are you sure you want to delete this ${label.toLowerCase()}?`);
  // if (!confirmDelete) return;

  console.log(`[deleteEntry] Proceeding to delete ${label} (ID: ${id})`);

  // Optimistic UI Update
  if (setter) {
    setter((prev) => {
      const filtered = prev.filter((item) => String(item.id) !== String(id));
      console.log(`[deleteEntry] Optimistic update: filtered ${prev.length} -> ${filtered.length} items`);
      return filtered;
    });
  }

  try {
    const formattedEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const url = `${formattedEndpoint}/${id}`;
    console.log(`[deleteEntry] Sending DELETE request to: ${url}`);
    
    await API.delete(url);
    
    console.log(`[deleteEntry] Successfully deleted ${label}`);
    toast.success(`${label} deleted successfully`);
    if (onSuccess) onSuccess();
  } catch (err) {
    console.error(`[deleteEntry] Failed to delete ${label}:`, err);
    const errorDetail = err.response?.data?.detail;
    toast.error(typeof errorDetail === 'string' ? errorDetail : `Failed to delete ${label}`);
    
    // Refresh to restore original state on failure
    if (onSuccess) {
      console.log(`[deleteEntry] Calling onSuccess to restore state`);
      onSuccess();
    }
  }
};
