import { useAuth } from '@/modules/auth';
import type { SchedulerPermissions } from '../types/scheduler.types';

export const useSchedulerPermissions = (): SchedulerPermissions => {
  const { user } = useAuth();
  
  const checkSchedulerPermission = () => {
    if (!user?.role) return false;
    return ['administrator', 'owner', 'app_manager'].includes(user.role);
  };

  const checkSchedulerWorkflowPermission = () => {
    if (!user?.workflowPermissions?.scheduling) return false;
    const schedulingPerms = user.workflowPermissions.scheduling;
    return schedulingPerms.includes('create') || schedulingPerms.includes('edit');
  };

  return {
    canCreateShifts: checkSchedulerPermission() || checkSchedulerWorkflowPermission(),
    canViewDevelopment: checkSchedulerPermission() || checkSchedulerWorkflowPermission(),
    canEditSchedules: checkSchedulerPermission() || checkSchedulerWorkflowPermission(),
    canDeleteSchedules: checkSchedulerPermission()
  };
};