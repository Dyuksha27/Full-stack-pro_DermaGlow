import API from "./axios";

export const fetchProductsAPI = async ({ page = 1, limit = 12, category = "", search = "" }) => {
  try {
    const response = await API.get("/products", {
      params: { page, limit, category, search }
    });
    // Returns the entire payload container object containing both { total, rows }
    return response.data; 
  } catch (error) {
    console.error("Error in fetchProductsAPI:", error.message);
    throw error;
  }
};

/**
 * 🔍 Fetches a single product directly by its ID/SKU endpoint: /api/products/:id
 */
export const fetchProductByIdAPI = async (id) => {
  try {
    const response = await API.get(`/products/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error in fetchProductByIdAPI:", error.message);
    throw error;
  }
};