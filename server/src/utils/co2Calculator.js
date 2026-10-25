/**
 * CO2 and Fare Split Estimator Utility.
 * Implements scientific transit calculations for Pune/PCMC intra-campus commuting.
 */

export const EMISSION_FACTORS = {
  car_petrol: 0.142, // kg CO2 per km
  car_diesel: 0.165, // kg CO2 per km
  car_cng: 0.108,    // kg CO2 per km
  bike: 0.045,       // kg CO2 per km
  auto: 0.080        // kg CO2 per km
};

export const CAB_RATES = {
  baseFare: 45,      // INR
  perKm: 20          // INR per km in Pune/PCMC
};

/**
 * Calculates fair share, private cab comparison and CO2 savings.
 * @param {number} distanceKm - Trip distance in km
 * @param {number} vehicleCostPerKm - Estimated vehicle operational cost (e.g. ₹9/km for fuel+wear)
 * @param {number} totalRiders - Total people in vehicle (Driver + Passengers)
 * @param {string} vehicleType - 'car' or 'bike'
 */
export const calculateRideMetrics = ({
  distanceKm = 15,
  vehicleCostPerKm = 9,
  totalRiders = 3,
  vehicleType = 'car'
}) => {
  const riders = Math.max(1, totalRiders);
  const totalTripCost = Math.round(distanceKm * vehicleCostPerKm);
  const fairSharePerPerson = Math.round(totalTripCost / riders);

  // Private cab benchmark (Ola/Uber/Auto in Pune)
  const soloCabCost = Math.round(CAB_RATES.baseFare + distanceKm * CAB_RATES.perKm);
  const savingsPerPassenger = Math.max(0, soloCabCost - fairSharePerPerson);

  // CO2 Emissions (kg)
  const factor = vehicleType === 'bike' ? EMISSION_FACTORS.bike : EMISSION_FACTORS.car_petrol;
  const singleVehicleEmission = parseFloat((distanceKm * factor).toFixed(2));
  
  // If riders took individual vehicles vs 1 shared vehicle:
  // Emission without carpool = riders * singleVehicleEmission
  // Emission with carpool = 1 * singleVehicleEmission
  // Net CO2 saved = (riders - 1) * singleVehicleEmission
  const co2SavedKg = riders > 1 ? parseFloat(((riders - 1) * singleVehicleEmission).toFixed(2)) : 0;

  return {
    distanceKm,
    totalTripCost,
    fairSharePerPerson,
    soloCabCost,
    savingsPerPassenger,
    totalGroupSavings: savingsPerPassenger * (riders - 1),
    singleVehicleEmissionKg: singleVehicleEmission,
    co2SavedKg,
    treesEquivalent: parseFloat((co2SavedKg / 21.77).toFixed(3)) // 1 mature tree absorbs ~21.77 kg CO2/yr
  };
};
