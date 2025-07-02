import { Router } from 'express';
import { storage } from '../../storage';

const applicantWorkflowRoutes = Router();

// Get applicants by status (replaces /api/applicants/status/:status)
applicantWorkflowRoutes.get("/status/:status", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { status } = req.params;
    
    // Get all users from storage
    const allUsers = await storage.getUsers();
    
    // Filter for applicants with specific status
    const applicants = allUsers.filter(user => 
      user.role === 'applicant' && user.status === status
    );
    
    // Remove passwords from response
    const filteredApplicants = applicants.map(({ password: _password, ...user }) => user);
    
    res.json(filteredApplicants);
  } catch (error) {
    console.error("Error fetching applicants by status:", error);
    res.status(500).json({ error: "Failed to fetch applicants by status" });
  }
});

// Additional applicant-specific workflow endpoints can be added here
// For example: interview scheduling, application review, etc.

export default applicantWorkflowRoutes;