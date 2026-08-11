function validateUCO(data) {
  const errors = [];
  if (!data) return { valid: false, errors: ["Null or undefined payload"] };
  if (!data.capacityId || typeof data.capacityId !== "string") errors.push("capacityId is required");
  if (!data.ownerId || typeof data.ownerId !== "string") errors.push("ownerId is required");
  if (!data.vehicleId || typeof data.vehicleId !== "string") errors.push("vehicleId is required");
  if (!data.currentLocation || typeof data.currentLocation.lat !== "number" || typeof data.currentLocation.lng !== "number") {
    errors.push("currentLocation.lat and lng numbers are required");
  }
  if (!data.destination || typeof data.destination.lat !== "number" || typeof data.destination.lng !== "number") {
    errors.push("destination.lat and lng numbers are required");
  }
  if (typeof data.availableSeats !== "number" || data.availableSeats < 0) errors.push("availableSeats must be non-negative");
  if (typeof data.availableWeightKg !== "number" || data.availableWeightKg < 0) errors.push("availableWeightKg must be non-negative");
  if (typeof data.availableVolumeL !== "number" || data.availableVolumeL < 0) errors.push("availableVolumeL must be non-negative");
  const validStatuses = ["Available", "Reserved", "Accepted", "Loaded", "Delivered", "Closed"];
  if (!validStatuses.includes(data.status)) errors.push(`status must be one of ${validStatuses.join(", ")}`);
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true, errors: [], uco: data };
}
function validateUDO(data) {
  const errors = [];
  if (!data) return { valid: false, errors: ["Null or undefined payload"] };
  if (!data.demandId || typeof data.demandId !== "string") errors.push("demandId is required");
  if (!data.requesterId || typeof data.requesterId !== "string") errors.push("requesterId is required");
  const validTypes = ["Passenger", "Parcel", "AgriculturalGoods", "FoodDelivery", "Medicine", "Emergency"];
  if (!validTypes.includes(data.demandType)) errors.push(`demandType must be one of ${validTypes.join(", ")}`);
  if (!data.pickupLocation || typeof data.pickupLocation.lat !== "number" || typeof data.pickupLocation.lng !== "number") {
    errors.push("pickupLocation.lat and lng numbers are required");
  }
  if (!data.dropLocation || typeof data.dropLocation.lat !== "number" || typeof data.dropLocation.lng !== "number") {
    errors.push("dropLocation.lat and lng numbers are required");
  }
  if (typeof data.weightKg !== "number" || data.weightKg < 0) errors.push("weightKg must be non-negative");
  if (typeof data.volumeL !== "number" || data.volumeL < 0) errors.push("volumeL must be non-negative");
  if (typeof data.passengerCount !== "number" || data.passengerCount < 0) errors.push("passengerCount must be non-negative");
  const validPriorities = ["Low", "Medium", "High", "Critical"];
  if (!validPriorities.includes(data.priority)) errors.push(`priority must be one of ${validPriorities.join(", ")}`);
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true, errors: [], udo: data };
}
export {
  validateUCO,
  validateUDO
};
