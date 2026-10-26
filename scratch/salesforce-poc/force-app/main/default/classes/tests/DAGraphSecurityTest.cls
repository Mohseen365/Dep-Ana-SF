/**
 * @description Multi-tenant isolation and security tests for DA_* objects
 */
@IsTest
private class DAGraphSecurityTest {

    @IsTest
    static void testProjectIsolation() {
        DA_Project__c projA = new DA_Project__c(Name = 'Project A', Project_Key__c = 'PROJ_A');
        DA_Project__c projB = new DA_Project__c(Name = 'Project B', Project_Key__c = 'PROJ_B');
        insert new List<DA_Project__c>{ projA, projB };

        DA_Analysis_Run__c runA = new DA_Analysis_Run__c(DA_Project__c = projA.Id, Name = 'Run A');
        DA_Analysis_Run__c runB = new DA_Analysis_Run__c(DA_Project__c = projB.Id, Name = 'Run B');
        insert new List<DA_Analysis_Run__c>{ runA, runB };

        Test.startTest();
        DAGraphDTO dtoA = DAGraphController.getLatestGraphForProject(projA.Id);
        Test.stopTest();

        Assert.areEqual(projA.Id, dtoA.projectId, 'Retrieved DTO must match Project A ID strictly');
        Assert.areNotEqual(projB.Id, dtoA.projectId, 'Retrieved DTO must not expose Project B data');
    }
}