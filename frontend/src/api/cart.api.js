// src/api/cart.api.js
import API from "./axios";

export const fetchCartAPI = async () => {
  try {
    // 🛡️ Force fetch the token dynamically on execution to bypass interceptor lag
    const token = localStorage.getItem("token");

    const response = await API.get("/cart", {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return response.data;
  } catch (error) {
    console.error("Error inside fetchCartAPI:", error.message);
    throw error;
  }
};

export const updateCartItemAPI = async (productId, quantity, isIncrement = false) => {
  try {
    const token = localStorage.getItem("token");

    // Compute the explicit package body payload values
    const response = await API.post("/cart/add", {
      product_id: productId,
      quantity: quantity,
      isIncrement: isIncrement
    }, {
      // 🛡️ Explicit fallback header binding guarantees accuracy right after profile switches
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return response.data;
  } catch (error) {
    console.error("Error inside updateCartItemAPI:", error.message);
    throw error;
  }
};

export const removeCartItemAPI = async (productId) => {
  try {
    const token = localStorage.getItem("token");

    // Sending a quantity value of 0 deletes the matching row record cleanly
    const response = await API.post("/cart/add", {
      product_id: productId,
      quantity: 0
    }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return response.data;
  } catch (error) {
    console.error("Error inside removeCartItemAPI:", error.message);
    throw error;
  }
};