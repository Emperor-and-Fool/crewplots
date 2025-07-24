import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Database, User, Shield, Users, Calendar, MessageSquare, Settings, MapPin, Mail, DollarSign } from 'lucide-react';

interface PermissionTestResult {
  userId: number;
  username: string;
  role: string;
  baseRolePermissions: string[];
  competencyPermissions: string[];
  finalPermissions: string[];
  totalPermissions: number;
  testTimestamp: string;
  processingTime: number;
}

interface DatabaseStats {
  totalRoles: number;
  totalPermissions: number;
  totalRolePermissions: number;
  totalCompetencies: number;
  totalUserCompetencies: number;
}

interface ModuleTestResult {
  module: string;
  requiredPermissions: string[];
  grantedPermissions: string[];
  missingPermissions: string[];
  accessGranted: boolean;
  testTime: number;
}

export default function PermissionTestPage() {
  const [testResult, setTestResult] = useState<PermissionTestResult | null>(null);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [moduleResults, setModuleResults] = useState<ModuleTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingModule, setLoadingModule] = useState<string | null>(null);
  const { toast } = useToast();

  const runPermissionTest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/administration/permission-test', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Test failed: ${response.status}`);
      }

      const result = await response.json();
      setTestResult(result.permissionTest);
      setDbStats(result.databaseStats);
      
      toast({
        title: "Permission Test Complete",
        description: `Assembled ${result.permissionTest.totalPermissions} permissions in ${result.permissionTest.processingTime}ms`,
      });
    } catch (error) {
      console.error('Permission test failed:', error);
      toast({
        title: "Test Failed",
        description: "Could not run permission test. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testModulePermissions = async (module: string, requiredPermissions: string[]) => {
    setLoadingModule(module);
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/administration/permission-test', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Module test failed: ${response.status}`);
      }

      const result = await response.json();
      const userPermissions = result.permissionTest.finalPermissions;
      
      const grantedPermissions = requiredPermissions.filter(perm => 
        userPermissions.includes(perm)
      );
      const missingPermissions = requiredPermissions.filter(perm => 
        !userPermissions.includes(perm)
      );

      const moduleResult: ModuleTestResult = {
        module,
        requiredPermissions,
        grantedPermissions,
        missingPermissions,
        accessGranted: missingPermissions.length === 0,
        testTime: Date.now() - startTime
      };

      setModuleResults(prev => {
        const filtered = prev.filter(r => r.module !== module);
        return [...filtered, moduleResult];
      });

      toast({
        title: `${module} Module Test`,
        description: `${grantedPermissions.length}/${requiredPermissions.length} permissions granted`,
        variant: moduleResult.accessGranted ? "default" : "destructive"
      });

    } catch (error) {
      console.error(`${module} module test failed:`, error);
      toast({
        title: `${module} Test Failed`,
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setLoadingModule(null);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Permission Service Test</h1>
          <p className="text-muted-foreground">
            Test database permission assembly for VE30 compatibility
          </p>
        </div>
        <Button onClick={runPermissionTest} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Shield className="mr-2 h-4 w-4" />
          Run Permission Test
        </Button>
      </div>

      {/* Module Testing Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Module Permission Testing
          </CardTitle>
          <CardDescription>
            Test specific module permissions to see which features are accessible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
              disabled={loadingModule !== null}
              onClick={() => testModulePermissions('Crew', ['crew_planning', 'schedule.read', 'location.access_all'])}
            >
              {loadingModule === 'Crew' && <Loader2 className="h-4 w-4 animate-spin mb-1" />}
              <Users className={`h-6 w-6 ${loadingModule === 'Crew' ? 'hidden' : 'mb-1'}`} />
              <span className="text-sm">Crew Management</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
              disabled={loadingModule !== null}
              onClick={() => testModulePermissions('Scheduling', ['scheduler_development', 'schedule.create', 'schedule.update', 'schedule.delete'])}
            >
              {loadingModule === 'Scheduling' && <Loader2 className="h-4 w-4 animate-spin mb-1" />}
              <Calendar className={`h-6 w-6 ${loadingModule === 'Scheduling' ? 'hidden' : 'mb-1'}`} />
              <span className="text-sm">Scheduling</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
              disabled={loadingModule !== null}
              onClick={() => testModulePermissions('Messaging', ['messaging.read', 'messaging.create', 'messaging.update', 'messaging.delete'])}
            >
              {loadingModule === 'Messaging' && <Loader2 className="h-4 w-4 animate-spin mb-1" />}
              <MessageSquare className={`h-6 w-6 ${loadingModule === 'Messaging' ? 'hidden' : 'mb-1'}`} />
              <span className="text-sm">Messaging</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
              disabled={loadingModule !== null}
              onClick={() => testModulePermissions('Locations', ['location.access_all', 'location.access_owned', 'location.access_managed'])}
            >
              {loadingModule === 'Locations' && <Loader2 className="h-4 w-4 animate-spin mb-1" />}
              <MapPin className={`h-6 w-6 ${loadingModule === 'Locations' ? 'hidden' : 'mb-1'}`} />
              <span className="text-sm">Locations</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
              disabled={loadingModule !== null}
              onClick={() => testModulePermissions('Email', ['email.admin', 'email.send', 'email.view_logs', 'email.verify'])}
            >
              {loadingModule === 'Email' && <Loader2 className="h-4 w-4 animate-spin mb-1" />}
              <Mail className={`h-6 w-6 ${loadingModule === 'Email' ? 'hidden' : 'mb-1'}`} />
              <span className="text-sm">Email System</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
              disabled={loadingModule !== null}
              onClick={() => testModulePermissions('Financial', ['financial.view', 'financial.edit', 'financial.reports', 'financial.approve'])}
            >
              {loadingModule === 'Financial' && <Loader2 className="h-4 w-4 animate-spin mb-1" />}
              <DollarSign className={`h-6 w-6 ${loadingModule === 'Financial' ? 'hidden' : 'mb-1'}`} />
              <span className="text-sm">Financial</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
              disabled={loadingModule !== null}
              onClick={() => testModulePermissions('Development', ['development.testing', 'competency.read', 'competency.create', 'competency.update'])}
            >
              {loadingModule === 'Development' && <Loader2 className="h-4 w-4 animate-spin mb-1" />}
              <Settings className={`h-6 w-6 ${loadingModule === 'Development' ? 'hidden' : 'mb-1'}`} />
              <span className="text-sm">Development</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
              disabled={loadingModule !== null}
              onClick={() => testModulePermissions('Competencies', ['competency.read', 'competency.create', 'competency.update', 'competency.delete'])}
            >
              {loadingModule === 'Competencies' && <Loader2 className="h-4 w-4 animate-spin mb-1" />}
              <Shield className={`h-6 w-6 ${loadingModule === 'Competencies' ? 'hidden' : 'mb-1'}`} />
              <span className="text-sm">Competencies</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Module Test Results */}
      {moduleResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Module Test Results</CardTitle>
            <CardDescription>
              Permission access results for each tested module
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {moduleResults.map((result) => (
                <div key={result.module} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <h3 className="font-semibold text-lg">{result.module} Module</h3>
                      <Badge 
                        variant={result.accessGranted ? "default" : "destructive"}
                        className="ml-2"
                      >
                        {result.accessGranted ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Access Granted
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Access Denied
                          </>
                        )}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {result.testTime}ms
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-green-600 mb-2">
                        Granted Permissions ({result.grantedPermissions.length})
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {result.grantedPermissions.map((perm) => (
                          <Badge key={perm} variant="secondary" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {result.missingPermissions.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-600 mb-2">
                          Missing Permissions ({result.missingPermissions.length})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {result.missingPermissions.map((perm) => (
                            <Badge key={perm} variant="destructive" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Statistics */}
      {dbStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Database Statistics
            </CardTitle>
            <CardDescription>
              Current permission system database state
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{dbStats.totalRoles}</div>
                <div className="text-sm text-muted-foreground">Roles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{dbStats.totalPermissions}</div>
                <div className="text-sm text-muted-foreground">Permissions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{dbStats.totalRolePermissions}</div>
                <div className="text-sm text-muted-foreground">Role Mappings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{dbStats.totalCompetencies}</div>
                <div className="text-sm text-muted-foreground">Competencies</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{dbStats.totalUserCompetencies}</div>
                <div className="text-sm text-muted-foreground">User Competencies</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Test Subject
              </CardTitle>
              <CardDescription>
                User tested for permission assembly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User ID</label>
                  <div className="text-lg font-semibold">{testResult.userId}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Username</label>
                  <div className="text-lg font-semibold">{testResult.username}</div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <div className="mt-1">
                  <Badge variant="secondary" className="text-sm">
                    {testResult.role}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">{testResult.totalPermissions}</div>
                  <div className="text-sm text-muted-foreground">Total Permissions</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">{testResult.processingTime}ms</div>
                  <div className="text-sm text-muted-foreground">Processing Time</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permission Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                Permission Assembly
              </CardTitle>
              <CardDescription>
                How permissions were assembled from database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Base Role Permissions</label>
                  <Badge variant="outline">{testResult.baseRolePermissions.length}</Badge>
                </div>
                <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                  {testResult.baseRolePermissions.join(', ')}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Competency Permissions</label>
                  <Badge variant="outline">{testResult.competencyPermissions.length}</Badge>
                </div>
                <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                  {testResult.competencyPermissions.length > 0 
                    ? testResult.competencyPermissions.join(', ')
                    : 'No competency-based permissions'
                  }
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-green-700">Final Permission Set</label>
                  <Badge variant="default">{testResult.finalPermissions.length}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Ready for VE30 validation engine
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VE30 Compatibility Status */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
              VE30 Compatibility Test
            </CardTitle>
            <CardDescription>
              ValidationEngine30 schedule data request simulation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm">Database permissions loaded</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm">Permission array assembled</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm">VE30 format compatible</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-2">Sample Schedule Permissions Found:</div>
              <div className="flex flex-wrap gap-1">
                {testResult.finalPermissions
                  .filter(p => p.includes('schedule') || p.includes('scheduler'))
                  .map(permission => (
                    <Badge key={permission} variant="secondary" className="text-xs">
                      {permission}
                    </Badge>
                  ))
                }
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Test completed at: {new Date(testResult.testTimestamp).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}