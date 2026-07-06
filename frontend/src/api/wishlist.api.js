import API from "./axios";

/**
 * Fetches the authenticated user's flat array of saved wishlist IDs
 */
export const fetchWishlistAPI = async () => {
  try {
    const response = await API.get("/wishlist");
    return response.data || [];
  } catch (error) {
    console.error("Error in fetchWishlistAPI:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Adds a product SKU to the user's backend profile indices
 */
export const addToWishlistAPI = async (productId) => {
  try {
    const response = await API.post("/wishlist", { productId });
    return response.data;
  } catch (error) {
    console.error("Error in addToWishlistAPI:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Deletes a product registration maps from the database structures
 */
export const removeFromWishlistAPI = async (productId) => {
  try {
    const response = await API.delete(`/wishlist/${productId}`);
    return response.data;
  } catch (error) {
    console.error("Error in removeFromWishlistAPI:", error.response?.data || error.message);
    throw error;
  }
};