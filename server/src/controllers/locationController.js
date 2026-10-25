import { PUNE_LOCALITIES } from '../utils/locations.js';
import { successResponse } from '../utils/apiResponse.js';

export const getPuneLocalities = (req, res) => {
  return successResponse(res, 200, 'Pune/PCMC localities retrieved.', PUNE_LOCALITIES);
};
