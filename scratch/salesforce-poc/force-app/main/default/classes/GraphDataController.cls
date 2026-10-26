public with sharing class GraphDataController {

    public class NodeDTO {
        @AuraEnabled public String id { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public String type { get; set; }
        @AuraEnabled public String layer { get; set; }
        @AuraEnabled public String domain { get; set; }
    }

    public class EdgeDTO {
        @AuraEnabled public String id { get; set; }
        @AuraEnabled public String source { get; set; }
        @AuraEnabled public String target { get; set; }
        @AuraEnabled public String relationshipType { get; set; }
    }

    public class GraphPayloadDTO {
        @AuraEnabled public String projectId { get; set; }
        @AuraEnabled public List<NodeDTO> nodes { get; set; }
        @AuraEnabled public List<EdgeDTO> edges { get; set; }

        public GraphPayloadDTO() {
            this.nodes = new List<NodeDTO>();
            this.edges = new List<EdgeDTO>();
        }
    }

    @AuraEnabled(cacheable=true)
    public static GraphPayloadDTO getGraphData(String projectId) {
        GraphPayloadDTO payload = new GraphPayloadDTO();
        payload.projectId = projectId;

        // Prototype Stub: Fetches metadata nodes & edges within governor limits
        NodeDTO node1 = new NodeDTO();
        node1.id = 'ApexClass:AccountController';
        node1.name = 'AccountController';
        node1.type = 'ApexClass';
        node1.layer = 'controller';
        node1.domain = 'sales';
        payload.nodes.add(node1);

        NodeDTO node2 = new NodeDTO();
        node2.id = 'CustomObject:Account';
        node2.name = 'Account';
        node2.type = 'CustomObject';
        node2.layer = 'model';
        node2.domain = 'core';
        payload.nodes.add(node2);

        EdgeDTO edge1 = new EdgeDTO();
        edge1.id = 'edge1';
        edge1.source = node1.id;
        edge1.target = node2.id;
        edge1.relationshipType = 'SOQL';
        payload.edges.add(edge1);

        return payload;
    }
}
