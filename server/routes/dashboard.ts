import { Router } from "express";
import { storage } from "../storage";

const router = Router();

// Unified dashboard data endpoint - single efficient call
router.get("/dashboard-data", async (req, res) => {
  try {
    // Fetch all dashboard data in parallel for maximum efficiency
    const [applicants, locations] = await Promise.all([
      storage.getApplicants(),
      storage.getLocations()
    ]);

    // Return unified response
    res.json({
      success: true,
      data: {
        applicants,
        locations,
        summary: {
          totalApplicants: applicants.length,
          newApplicants: applicants.filter(a => a.status === 'new').length,
          shortListedApplicants: applicants.filter(a => 
            a.status === 'contacted' || 
            a.status === 'interviewed' || 
            a.status === 'short-listed'
          ).length
        }
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard data"
    });
  }
});

export default router;