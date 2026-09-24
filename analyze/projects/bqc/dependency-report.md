# Salesforce Dependency Report

## LWC → Apex

| LWC | Apex | Method |
|---|---|---|
| LWC:bouquet-capacity-panel | ApexClass:BouquetCapacityController | getCapacityPlanningRows |
| LWC:bouquet-capacity-panel | ApexClass:BouquetCapacityController | updateProgress |
| LWC:bouquet-capacity-panel | ApexClass:BouquetCapacityController | overrideCapacity |
| LWC:bouquet-catalog | ApexClass:BouquetProductController | getAvailableProducts |
| LWC:bouquet-featured-products | ApexClass:BouquetProductController | getFeaturedProducts |
| LWC:bouquet-order-form | ApexClass:BouquetOrderFormController | placeOrder |
| LWC:bouquet-order-list | ApexClass:BouquetOrderListController | getMyOrders |
| LWC:bouquet-order-panel | ApexClass:BouquetOrderController | getOrdersByStatus |
| LWC:bouquet-order-panel | ApexClass:BouquetOrderController | getCapacityPreview |
| LWC:bouquet-order-panel | ApexClass:BouquetOrderController | acceptOrder |
| LWC:bouquet-order-panel | ApexClass:BouquetOrderController | updateOrderStatus |
| LWC:bouquet-order-panel | ApexClass:BouquetLogger | logClientError |
| LWC:bouquet-payment | ApexClass:BouquetTrackingController | getOrderDetails |
| LWC:bouquet-payment | ApexClass:BouquetPaymentController | processPaypalPayment |
| LWC:bouquet-product-manager | ApexClass:BouquetProductController | getAvailableProducts |
| LWC:bouquet-profile | ApexClass:BouquetUserController | getUserProfile |
| LWC:bouquet-tracking | ApexClass:BouquetTrackingController | getOrderDetails |
| LWC:bouquet-tracking | ApexClass:BouquetTrackingController | getOrderFiles |
| LWC:bouquet-tracking | ApexClass:BouquetTrackingController | trackOrder |

## LWC → LWC

| Parent | Child | Type |
|---|---|---|
| LWC:bouquet-home | LWC:bouquet-header | lwc-import |
| LWC:bouquet-home | LWC:bouquet-featured-products | lwc-import |
| LWC:bouquet-home | LWC:bouquet-footer | lwc-import |
| LWC:bouquet-catalog | LWC:bouquet-product-card | lwc-template-child |
| LWC:bouquet-featured-products | LWC:bouquet-product-card | lwc-template-child |
| LWC:bouquet-home | LWC:bouquet-header | lwc-template-child |
| LWC:bouquet-home | LWC:bouquet-featured-products | lwc-template-child |
| LWC:bouquet-home | LWC:bouquet-footer | lwc-template-child |
| LWC:bouquet-order-form | LWC:bouquet-google-signin | lwc-template-child |

## Apex → Apex

| From | To | Type | Method |
|---|---|---|---|
| ApexClass:BouquetCapacityController | External:CapacityRow | instantiation | getCapacityPlanningRows |
| ApexClass:BouquetCapacityController | External:OrderReservation | instantiation | getCapacityPlanningRows |
| ApexClass:BouquetCapacityController | ApexClass:BouquetException | instantiation | overrideCapacity |
| ApexClass:BouquetCapacityController | ApexClass:BouquetLogger | method-call | handleException -> error |
| ApexClass:BouquetCapacityController | ApexClass:BouquetSettings | method-call | getCapacityPlanningRows -> getProductionHoursPerDay |
| ApexClass:BouquetCapacityController | ApexClass:BouquetCapacityService | method-call | overrideCapacity -> overrideCapacity |
| ApexClass:BouquetCapacityController | ApexClass:BouquetCapacityService | method-call | updateProgress -> updateProgress |
| ApexClass:BouquetCapacityController | External:CapacityRow | type-reference |  |
| ApexClass:BouquetCapacityController | CustomObject:Bouquet_Capacity__c | type-reference | getCapacityPlanningRows |
| ApexClass:BouquetCapacityController | External:OrderReservation | type-reference |  |
| ApexClass:BouquetCapacityController | CustomObject:Bouquet_Order__c | type-reference | getCapacityPlanningRows |
| ApexClass:BouquetCapacityController | ApexClass:BouquetException | type-reference | overrideCapacity |
| ApexClass:BouquetCapacityController | External:OrderReservation | generic-type |  |
| ApexClass:BouquetCapacityController | External:CapacityRow | generic-type |  |
| ApexClass:BouquetCapacityController | CustomObject:Bouquet_Capacity__c | generic-type | getCapacityPlanningRows |
| ApexClass:BouquetCapacityController | External:Profile | generic-type | hasManageCapacityPermission |
| ApexClass:BouquetCapacityControllerTest | CustomObject:Bouquet_Capacity__c | instantiation | setup |
| ApexClass:BouquetCapacityControllerTest | External:Contact | instantiation | setup |
| ApexClass:BouquetCapacityControllerTest | CustomObject:Bouquet_Order__c | instantiation | setup |
| ApexClass:BouquetCapacityControllerTest | CustomObject:Bouquet_Capacity_Reservation__c | instantiation | setup |
| ApexClass:BouquetCapacityControllerTest | ApexClass:BouquetCapacityController | method-call | testGetRows -> getCapacityPlanningRows |
| ApexClass:BouquetCapacityControllerTest | ApexClass:BouquetCapacityController | method-call | testUpdateProgressSuccess -> updateProgress |
| ApexClass:BouquetCapacityControllerTest | ApexClass:BouquetCapacityController | method-call | testOverrideCapacitySuccess -> overrideCapacity |
| ApexClass:BouquetCapacityControllerTest | CustomObject:Bouquet_Capacity__c | type-reference | setup |
| ApexClass:BouquetCapacityControllerTest | External:Contact | type-reference | setup |
| ApexClass:BouquetCapacityControllerTest | CustomObject:Bouquet_Order__c | type-reference | setup |
| ApexClass:BouquetCapacityControllerTest | CustomObject:Bouquet_Capacity_Reservation__c | type-reference | setup |
| ApexClass:BouquetCapacityControllerTest | External:OrderReservation | type-reference | testGetRows |
| ApexClass:BouquetCapacityControllerTest | CustomObject:Bouquet_Capacity__c | generic-type | testOverrideCapacitySuccess |
| ApexClass:BouquetCapacityControllerTest | ApexClass:BouquetCapacityController | test-reference |  |
| ApexClass:BouquetCapacityRepository | CustomObject:Bouquet_Capacity__c | generic-type |  |
| ApexClass:BouquetCapacityRepository | CustomObject:Bouquet_Capacity_Reservation__c | generic-type |  |
| ApexClass:BouquetCapacityRepository | ApexClass:IBouquetCapacityRepository | implements |  |
| ApexClass:BouquetCapacityService | ApexClass:BouquetException | instantiation | handleException |
| ApexClass:BouquetCapacityService | CustomObject:Bouquet_Capacity__c | instantiation | overrideCapacity |
| ApexClass:BouquetCapacityService | CustomObject:Bouquet_Schedule_Request__e | instantiation | overrideCapacity |
| ApexClass:BouquetCapacityService | ApexClass:BouquetLogger | method-call | handleException -> error |
| ApexClass:BouquetCapacityService | ApexClass:BouquetLogger | method-call | overrideCapacity -> logAudit |
| ApexClass:BouquetCapacityService | ApexClass:BouquetException | type-reference | handleException |
| ApexClass:BouquetCapacityService | CustomObject:Bouquet_Capacity__c | type-reference | overrideCapacity |
| ApexClass:BouquetCapacityService | External:UpsertResult | type-reference | overrideCapacity |
| ApexClass:BouquetCapacityService | CustomObject:Bouquet_Capacity_Reservation__c | type-reference | updateProgress |
| ApexClass:BouquetCapacityService | CustomObject:Bouquet_Order__c | type-reference | updateProgress |
| ApexClass:BouquetCapacityService | External:Profile | generic-type | hasManageCapacityPermission |
| ApexClass:BouquetCapacityService | CustomObject:Bouquet_Capacity_Reservation__c | generic-type | updateProgress |
| ApexClass:BouquetCapacityService | CustomObject:Bouquet_Order__c | generic-type | updateProgress |
| ApexClass:BouquetContactRepository | ApexClass:IBouquetContactRepository | implements |  |
| ApexClass:BouquetEmailService | ApexClass:BouquetEmailServiceImpl | instantiation |  |
| ApexClass:BouquetEmailService | ApexClass:IBouquetEmailService | type-reference |  |
| ApexClass:BouquetEmailServiceImpl | ApexClass:BouquetLogger | method-call | sendTemplateEmail -> log |
| ApexClass:BouquetEmailServiceImpl | ApexClass:BouquetLogger | method-call | sendTemplateEmail -> error |
| ApexClass:BouquetEmailServiceImpl | External:EmailTemplate | type-reference | sendTemplateEmail |
| ApexClass:BouquetEmailServiceImpl | External:SingleEmailMessage | type-reference | sendTemplateEmail |
| ApexClass:BouquetEmailServiceImpl | External:EmailException | type-reference | sendTemplateEmail |
| ApexClass:BouquetEmailServiceImpl | External:EmailTemplate | generic-type | sendTemplateEmail |
| ApexClass:BouquetEmailServiceImpl | ApexClass:IBouquetEmailService | implements |  |
| ApexClass:BouquetEmailServiceTest | External:Contact | instantiation | setup |
| ApexClass:BouquetEmailServiceTest | ApexClass:BouquetEmailServiceImpl | instantiation | testSendTemplateEmailViaInterface |
| ApexClass:BouquetEmailServiceTest | ApexClass:BouquetEmailService | method-call | testSendTemplateEmailBlankInputs -> sendTemplateEmail |
| ApexClass:BouquetEmailServiceTest | External:Contact | type-reference | setup |
| ApexClass:BouquetEmailServiceTest | ApexClass:IBouquetEmailService | type-reference | testSendTemplateEmailViaInterface |
| ApexClass:BouquetEmailServiceTest | CustomObject:Bouquet_Log__c | generic-type | testSendTemplateEmailMissingTemplate |
| ApexClass:BouquetEmailServiceTest | ApexClass:BouquetEmailService | test-reference |  |
| ApexClass:BouquetEmailServiceTest | ApexClass:IBouquetEmailService | test-reference |  |
| ApexClass:BouquetEmailServiceTest | ApexClass:BouquetEmailServiceImpl | test-reference |  |
| ApexClass:BouquetException | External:Exception | extends |  |
| ApexClass:BouquetLogger | CustomObject:Bouquet_Log__c | instantiation | log |
| ApexClass:BouquetLogger | CustomObject:Bouquet_Event__c | instantiation | logEvent |
| ApexClass:BouquetLogger | CustomObject:Bouquet_Audit_Log__c | instantiation | logAudit |
| ApexClass:BouquetLogger | External:INFO | method-call | log -> name |
| ApexClass:BouquetLogger | External:Severity | type-reference |  |
| ApexClass:BouquetLogger | CustomObject:Bouquet_Log__c | type-reference | log |
| ApexClass:BouquetLogger | External:JSONException | type-reference | logEvent |
| ApexClass:BouquetLogger | CustomObject:Bouquet_Event__c | type-reference | logEvent |
| ApexClass:BouquetLogger | CustomObject:Bouquet_Audit_Log__c | type-reference | logAudit |
| ApexClass:BouquetOrderController | ApexClass:BouquetOrderService | instantiation | getService |
| ApexClass:BouquetOrderController | ApexClass:BouquetException | instantiation | getOrdersByStatus |
| ApexClass:BouquetOrderController | ApexClass:OrderPanelDTO | instantiation | getOrdersByStatus |
| ApexClass:BouquetOrderController | ApexClass:BouquetOrderSelector | method-call | getOrdersByStatus -> getOrdersByStatus |
| ApexClass:BouquetOrderController | External:LastModifiedDate | method-call | getOrdersByStatus -> getTime |
| ApexClass:BouquetOrderController | ApexClass:BouquetLogger | method-call | getOrdersByStatus -> error |
| ApexClass:BouquetOrderController | ApexClass:BouquetOrderSelector | method-call | getCapacityPreview -> getOrderById |
| ApexClass:BouquetOrderController | ApexClass:BouquetScheduler | method-call | getCapacityPreview -> checkAcceptability |
| ApexClass:BouquetOrderController | ApexClass:BouquetLogger | method-call | getCapacityPreview -> log |
| ApexClass:BouquetOrderController | CustomObject:Bouquet_Order__c | type-reference | getOrdersByStatus |
| ApexClass:BouquetOrderController | External:AcceptabilityResult | type-reference | getCapacityPreview |
| ApexClass:BouquetOrderController | CustomObject:Bouquet_Order__c | generic-type | getOrdersByStatus |
| ApexClass:BouquetOrderController | ApexClass:OrderPanelDTO | generic-type | getOrdersByStatus |
| ApexClass:BouquetOrderControllerTest | External:Product2 | instantiation | setup |
| ApexClass:BouquetOrderControllerTest | External:Contact | instantiation | setup |
| ApexClass:BouquetOrderControllerTest | CustomObject:Bouquet_Order__c | instantiation | setup |
| ApexClass:BouquetOrderControllerTest | CustomObject:Bouquet_Order_Item__c | instantiation | setup |
| ApexClass:BouquetOrderControllerTest | External:ContentVersion | instantiation | setup |
| ApexClass:BouquetOrderControllerTest | External:ContentDocumentLink | instantiation | setup |
| ApexClass:BouquetOrderControllerTest | ApexClass:OrderPanelDTO | instantiation | testGetOrders |
| ApexClass:BouquetOrderControllerTest | ApexClass:BouquetOrderController | method-call | testGetOrders -> getOrdersByStatus |
| ApexClass:BouquetOrderControllerTest | ApexClass:BouquetOrderController | method-call | testAcceptOrder -> acceptOrder |
| ApexClass:BouquetOrderControllerTest | ApexClass:BouquetOrderController | method-call | testGetPreview -> getCapacityPreview |
| ApexClass:BouquetOrderControllerTest | ApexClass:BouquetOrderController | method-call | testUpdateOrderStatus -> updateOrderStatus |
| ApexClass:BouquetOrderControllerTest | External:Product2 | type-reference | setup |
| ApexClass:BouquetOrderControllerTest | External:Contact | type-reference | setup |
| ApexClass:BouquetOrderControllerTest | CustomObject:Bouquet_Order__c | type-reference | setup |
| ApexClass:BouquetOrderControllerTest | External:ContentVersion | type-reference | setup |
| ApexClass:BouquetOrderControllerTest | ApexClass:OrderPanelDTO | type-reference | testGetOrders |
| ApexClass:BouquetOrderControllerTest | ApexClass:OrderPanelDTO | generic-type | testGetOrders |
| ApexClass:BouquetOrderControllerTest | ApexClass:BouquetOrderController | test-reference |  |
| ApexClass:BouquetOrderControllerTest | ApexClass:OrderPanelDTO | test-reference |  |
| ApexClass:BouquetOrderDomain | ApexClass:BouquetOrderDomainHelper | instantiation |  |
| ApexClass:BouquetOrderDomain | ApexClass:IBouquetOrderDomainHelper | type-reference |  |
| ApexClass:BouquetOrderDomain | CustomObject:Bouquet_Order__c | generic-type |  |
| ApexClass:BouquetOrderDomainHelper | CustomObject:Bouquet_Order_Changed__e | instantiation | handleStatusChanges |
| ApexClass:BouquetOrderDomainHelper | CustomObject:Bouquet_Schedule_Request__e | instantiation | handleStatusChanges |
| ApexClass:BouquetOrderDomainHelper | CustomObject:Bouquet_Notification_Event__e | instantiation | handleStatusChanges |
| ApexClass:BouquetOrderDomainHelper | ApexClass:BouquetOrderSelector | method-call | handleStatusChanges -> getContactsForNotifications |
| ApexClass:BouquetOrderDomainHelper | External:SCHEDULABLE_STATUSES | method-call | contains |
| ApexClass:BouquetOrderDomainHelper | CustomObject:Bouquet_Order__c | type-reference | generateOrderNumbers |
| ApexClass:BouquetOrderDomainHelper | CustomObject:Bouquet_Notification_Event__e | type-reference | handleStatusChanges |
| ApexClass:BouquetOrderDomainHelper | CustomObject:Bouquet_Order__c | generic-type | generateOrderNumbers |
| ApexClass:BouquetOrderDomainHelper | CustomObject:Bouquet_Notification_Event__e | generic-type | handleStatusChanges |
| ApexClass:BouquetOrderDomainHelper | CustomObject:Bouquet_Order_Changed__e | generic-type | handleStatusChanges |
| ApexClass:BouquetOrderDomainHelper | ApexClass:IBouquetOrderDomainHelper | implements |  |
| ApexClass:BouquetOrderDomainTest | CustomObject:Bouquet_Order__c | instantiation | generateOrderNumbers_generatesOnlyMissingNumbers |
| ApexClass:BouquetOrderDomainTest | ApexClass:BouquetOrderDomain | instantiation |  |
| ApexClass:BouquetOrderDomainTest | External:Contact | instantiation | handleStatusChanges_publishesDeduplicatedEventsForBulkScope |
| ApexClass:BouquetOrderDomainTest | External:Order_Number__c | method-call | generateOrderNumbers_generatesOnlyMissingNumbers -> startsWith |
| ApexClass:BouquetOrderDomainTest | ApexClass:BouquetOrderDomain | method-call | handleStatusChanges_publishesDeduplicatedEventsForBulkScope -> resetTransactionGuard |
| ApexClass:BouquetOrderDomainTest | CustomObject:Bouquet_Order__c | type-reference | generateOrderNumbers_generatesOnlyMissingNumbers |
| ApexClass:BouquetOrderDomainTest | External:Contact | type-reference | handleStatusChanges_publishesDeduplicatedEventsForBulkScope |
| ApexClass:BouquetOrderDomainTest | CustomObject:Bouquet_Order__c | generic-type | generateOrderNumbers_generatesOnlyMissingNumbers |
| ApexClass:BouquetOrderDomainTest | ApexClass:BouquetOrderDomain | test-reference |  |
| ApexClass:BouquetOrderFormController | ApexClass:BouquetOrderFormValidator | method-call | placeOrder -> validate |
| ApexClass:BouquetOrderFormController | ApexClass:BouquetOrderFormService | method-call | placeOrder -> placeOrder |
| ApexClass:BouquetOrderFormController | ApexClass:BouquetLogger | method-call | placeOrder -> error |
| ApexClass:BouquetOrderFormController | ApexClass:BouquetOrderRequestDTO | type-reference | placeOrder |
| ApexClass:BouquetOrderFormControllerTest | External:Product2 | instantiation | setup |
| ApexClass:BouquetOrderFormControllerTest | External:Contact | instantiation | setup |
| ApexClass:BouquetOrderFormControllerTest | CustomObject:Bouquet_Order__c | instantiation | setup |
| ApexClass:BouquetOrderFormControllerTest | CustomObject:Bouquet_Order_Item__c | instantiation | setup |
| ApexClass:BouquetOrderFormControllerTest | External:ContentVersion | instantiation | setup |
| ApexClass:BouquetOrderFormControllerTest | External:ContentDocumentLink | instantiation | setup |
| ApexClass:BouquetOrderFormControllerTest | ApexClass:BouquetOrderRequestDTO | instantiation | testPlaceOrder |
| ApexClass:BouquetOrderFormControllerTest | ApexClass:BouquetOrderFormController | method-call | testPlaceOrder -> placeOrder |
| ApexClass:BouquetOrderFormControllerTest | External:Product2 | type-reference | setup |
| ApexClass:BouquetOrderFormControllerTest | External:Contact | type-reference | setup |
| ApexClass:BouquetOrderFormControllerTest | CustomObject:Bouquet_Order__c | type-reference | setup |
| ApexClass:BouquetOrderFormControllerTest | External:ContentVersion | type-reference | setup |
| ApexClass:BouquetOrderFormControllerTest | ApexClass:BouquetOrderRequestDTO | type-reference | testPlaceOrder |
| ApexClass:BouquetOrderFormControllerTest | ApexClass:BouquetOrderResponseDTO | type-reference | testPlaceOrder |
| ApexClass:BouquetOrderFormControllerTest | ApexClass:BouquetOrderRequestDTO | test-reference |  |
| ApexClass:BouquetOrderFormControllerTest | ApexClass:BouquetOrderResponseDTO | test-reference |  |
| ApexClass:BouquetOrderFormControllerTest | ApexClass:BouquetOrderFormController | test-reference |  |
| ApexClass:BouquetOrderFormService | ApexClass:BouquetOrderFormServiceImpl | instantiation |  |
| ApexClass:BouquetOrderFormService | ApexClass:IBouquetOrderFormService | type-reference |  |
| ApexClass:BouquetOrderFormService | ApexClass:BouquetOrderRequestDTO | type-reference | placeOrder |
| ApexClass:BouquetOrderFormServiceImpl | ApexClass:BouquetValidator | instantiation | placeOrder |
| ApexClass:BouquetOrderFormServiceImpl | ApexClass:BouquetPricingEngine | instantiation | placeOrder |
| ApexClass:BouquetOrderFormServiceImpl | ApexClass:BouquetPersistenceHandler | instantiation | placeOrder |
| ApexClass:BouquetOrderFormServiceImpl | ApexClass:BouquetOrderResponseDTO | instantiation |  |
| ApexClass:BouquetOrderFormServiceImpl | ApexClass:BouquetLogger | method-call | placeOrder -> error |
| ApexClass:BouquetOrderFormServiceImpl | ApexClass:BouquetOrderRequestDTO | type-reference | placeOrder |
| ApexClass:BouquetOrderFormServiceImpl | External:Savepoint | type-reference | placeOrder |
| ApexClass:BouquetOrderFormServiceImpl | ApexClass:IBouquetValidator | type-reference | placeOrder |
| ApexClass:BouquetOrderFormServiceImpl | ApexClass:IBouquetPricingEngine | type-reference | placeOrder |
| ApexClass:BouquetOrderFormServiceImpl | ApexClass:IBouquetPersistenceHandler | type-reference | placeOrder |
| ApexClass:BouquetOrderFormServiceImpl | External:Product2 | type-reference | placeOrder |
| ApexClass:BouquetOrderFormServiceImpl | CustomObject:Bouquet_Order__c | type-reference | placeOrder |
| ApexClass:BouquetOrderFormServiceImpl | ApexClass:IBouquetOrderFormService | implements |  |
| ApexClass:BouquetOrderFormServiceTest | ApexClass:BouquetOrderFormTestFactory | method-call | setup -> createTestData |
| ApexClass:BouquetOrderFormServiceTest | ApexClass:BouquetOrderFormTestFactory | method-call | testPlaceOrderGuestExistingContact -> getProduct |
| ApexClass:BouquetOrderFormServiceTest | ApexClass:BouquetOrderFormTestFactory | method-call | testPlaceOrderGuestExistingContact -> buildRequest |
| ApexClass:BouquetOrderFormServiceTest | ApexClass:BouquetOrderFormService | method-call | testPlaceOrderGuestExistingContact -> placeOrder |
| ApexClass:BouquetOrderFormServiceTest | ApexClass:BouquetOrderFormTestFactory | method-call | testPlaceOrderGuestExistingContact -> getExistingContact |
| ApexClass:BouquetOrderFormServiceTest | External:Product2 | type-reference | testPlaceOrderGuestExistingContact |
| ApexClass:BouquetOrderFormServiceTest | ApexClass:BouquetOrderRequestDTO | type-reference | testPlaceOrderGuestExistingContact |
| ApexClass:BouquetOrderFormServiceTest | ApexClass:BouquetOrderResponseDTO | type-reference | testPlaceOrderGuestExistingContact |
| ApexClass:BouquetOrderFormServiceTest | External:Contact | type-reference | testPlaceOrderGuestExistingContact |
| ApexClass:BouquetOrderFormServiceTest | CustomObject:Bouquet_Order__c | type-reference | testPlaceOrderGuestExistingContact |
| ApexClass:BouquetOrderFormServiceTest | CustomObject:Bouquet_Address__c | generic-type | testPlaceOrderGuestExistingContact |
| ApexClass:BouquetOrderFormServiceTest | CustomObject:Bouquet_Order__c | generic-type | testPlaceOrderNewContactAndAddressDeduplication |
| ApexClass:BouquetOrderFormServiceTest | ApexClass:BouquetOrderFormTestFactory | test-reference |  |
| ApexClass:BouquetOrderFormServiceTest | ApexClass:BouquetOrderRequestDTO | test-reference |  |
| ApexClass:BouquetOrderFormServiceTest | ApexClass:BouquetOrderResponseDTO | test-reference |  |
| ApexClass:BouquetOrderFormServiceTest | ApexClass:BouquetOrderFormService | test-reference |  |
| ApexClass:BouquetOrderFormTestFactory | External:Product2 | instantiation | createTestData |
| ApexClass:BouquetOrderFormTestFactory | External:Contact | instantiation |  |
| ApexClass:BouquetOrderFormTestFactory | CustomObject:Bouquet_Order__c | instantiation | createTestData |
| ApexClass:BouquetOrderFormTestFactory | CustomObject:Bouquet_Order_Item__c | instantiation | createTestData |
| ApexClass:BouquetOrderFormTestFactory | ApexClass:BouquetOrderRequestDTO | instantiation | buildRequest |
| ApexClass:BouquetOrderFormTestFactory | External:Product2 | type-reference | createTestData |
| ApexClass:BouquetOrderFormTestFactory | External:Contact | type-reference |  |
| ApexClass:BouquetOrderFormTestFactory | CustomObject:Bouquet_Order__c | type-reference | createTestData |
| ApexClass:BouquetOrderFormTestFactory | ApexClass:BouquetOrderRequestDTO | type-reference |  |
| ApexClass:BouquetOrderFormValidator | ApexClass:BouquetException | instantiation |  |
| ApexClass:BouquetOrderFormValidator | ApexClass:BouquetOrderRequestDTO | type-reference | validate |
| ApexClass:BouquetOrderListController | ApexClass:BouquetOrderSelector | method-call | getMyOrders -> getContactIdByUserId |
| ApexClass:BouquetOrderListController | ApexClass:BouquetOrderSelector | method-call | getMyOrders -> getOrdersByCustomer |
| ApexClass:BouquetOrderListController | ApexClass:BouquetLogger | method-call | getMyOrders -> error |
| ApexClass:BouquetOrderListController | CustomObject:Bouquet_Order__c | generic-type |  |
| ApexClass:BouquetOrderListControllerTest | External:Product2 | instantiation | setup |
| ApexClass:BouquetOrderListControllerTest | External:Contact | instantiation | setup |
| ApexClass:BouquetOrderListControllerTest | CustomObject:Bouquet_Order__c | instantiation | setup |
| ApexClass:BouquetOrderListControllerTest | CustomObject:Bouquet_Order_Item__c | instantiation | setup |
| ApexClass:BouquetOrderListControllerTest | External:ContentVersion | instantiation | setup |
| ApexClass:BouquetOrderListControllerTest | External:ContentDocumentLink | instantiation | setup |
| ApexClass:BouquetOrderListControllerTest | ApexClass:BouquetOrderListController | method-call | testGetMyOrders -> getMyOrders |
| ApexClass:BouquetOrderListControllerTest | External:Product2 | type-reference | setup |
| ApexClass:BouquetOrderListControllerTest | External:Contact | type-reference | setup |
| ApexClass:BouquetOrderListControllerTest | CustomObject:Bouquet_Order__c | type-reference | setup |
| ApexClass:BouquetOrderListControllerTest | External:ContentVersion | type-reference | setup |
| ApexClass:BouquetOrderListControllerTest | CustomObject:Bouquet_Order__c | generic-type | testGetMyOrders |
| ApexClass:BouquetOrderListControllerTest | ApexClass:BouquetOrderListController | test-reference |  |
| ApexClass:BouquetOrderRepository | External:CreatedDate | type-reference | getOrdersByStatus |
| ApexClass:BouquetOrderRepository | CustomObject:Bouquet_Order__c | generic-type |  |
| ApexClass:BouquetOrderRepository | ApexClass:IBouquetOrderRepository | implements |  |
| ApexClass:BouquetOrderSelector | ApexClass:BouquetOrderRepository | instantiation |  |
| ApexClass:BouquetOrderSelector | ApexClass:BouquetCapacityRepository | instantiation |  |
| ApexClass:BouquetOrderSelector | ApexClass:BouquetContactRepository | instantiation |  |
| ApexClass:BouquetOrderSelector | ApexClass:IBouquetOrderRepository | type-reference |  |
| ApexClass:BouquetOrderSelector | ApexClass:IBouquetCapacityRepository | type-reference |  |
| ApexClass:BouquetOrderSelector | ApexClass:IBouquetContactRepository | type-reference |  |
| ApexClass:BouquetOrderSelector | CustomObject:Bouquet_Order__c | generic-type |  |
| ApexClass:BouquetOrderSelector | External:ContentDocumentLink | generic-type |  |
| ApexClass:BouquetOrderSelector | External:User | generic-type | getContactIdByUserId |
| ApexClass:BouquetOrderSelector | CustomObject:Bouquet_Capacity__c | generic-type |  |
| ApexClass:BouquetOrderSelector | CustomObject:Bouquet_Capacity_Reservation__c | generic-type |  |
| ApexClass:BouquetOrderService | ApexClass:BouquetException | instantiation | acceptOrder |
| ApexClass:BouquetOrderService | ApexClass:BouquetLogger | method-call | acceptOrder -> log |
| ApexClass:BouquetOrderService | ApexClass:BouquetOrderSelector | method-call | acceptOrder -> getOrderById |
| ApexClass:BouquetOrderService | ApexClass:BouquetScheduler | method-call | acceptOrder -> validateCapacity |
| ApexClass:BouquetOrderService | ApexClass:BouquetOrderDomain | method-call | acceptOrder -> acceptOrder |
| ApexClass:BouquetOrderService | ApexClass:BouquetLogger | method-call | acceptOrder -> error |
| ApexClass:BouquetOrderService | ApexClass:BouquetOrderDomain | method-call | updateOrderStatus -> validateStatusTransition |
| ApexClass:BouquetOrderService | ApexClass:IBouquetOrderService | type-reference |  |
| ApexClass:BouquetOrderService | CustomObject:Bouquet_Order__c | type-reference | acceptOrder |
| ApexClass:BouquetOrderService | ApexClass:IBouquetOrderService | implements |  |
| ApexClass:BouquetOrderServiceTest | External:Product2 | instantiation | setup |
| ApexClass:BouquetOrderServiceTest | External:Contact | instantiation | setup |
| ApexClass:BouquetOrderServiceTest | CustomObject:Bouquet_Order__c | instantiation | setup |
| ApexClass:BouquetOrderServiceTest | CustomObject:Bouquet_Order_Item__c | instantiation | setup |
| ApexClass:BouquetOrderServiceTest | ApexClass:BouquetOrderService | instantiation | testAcceptOrderSuccess |
| ApexClass:BouquetOrderServiceTest | External:Product2 | type-reference | setup |
| ApexClass:BouquetOrderServiceTest | External:Contact | type-reference | setup |
| ApexClass:BouquetOrderServiceTest | CustomObject:Bouquet_Order__c | type-reference | setup |
| ApexClass:BouquetOrderServiceTest | ApexClass:IBouquetOrderService | type-reference | testAcceptOrderSuccess |
| ApexClass:BouquetOrderServiceTest | ApexClass:BouquetException | type-reference | testAcceptOrderInvalidStatus |
| ApexClass:BouquetOrderServiceTest | ApexClass:IBouquetOrderService | test-reference |  |
| ApexClass:BouquetOrderServiceTest | ApexClass:BouquetOrderService | test-reference |  |
| ApexClass:BouquetOrderServiceTest | ApexClass:BouquetException | test-reference |  |
| ApexClass:BouquetOrderTriggerHandler | ApexClass:BouquetOrderTriggerService | instantiation |  |
| ApexClass:BouquetOrderTriggerHandler | ApexClass:IBouquetOrderTriggerService | type-reference |  |
| ApexClass:BouquetOrderTriggerHandler | CustomObject:Bouquet_Order__c | generic-type |  |
| ApexClass:BouquetOrderTriggerHandler | ApexClass:TriggerHandler | extends |  |
| ApexClass:BouquetOrderTriggerService | ApexClass:BouquetOrderDomain | instantiation | beforeInsert |
| ApexClass:BouquetOrderTriggerService | CustomObject:Bouquet_Order__c | generic-type | beforeInsert |
| ApexClass:BouquetOrderTriggerService | ApexClass:IBouquetOrderTriggerService | implements |  |
| ApexClass:BouquetPaymentController | ApexClass:BouquetException | instantiation | processPaypalPayment |
| ApexClass:BouquetPaymentController | ApexClass:BouquetPaymentService | method-call | processPaypalPayment -> processPaypalPayment |
| ApexClass:BouquetPaymentController | ApexClass:BouquetLogger | method-call | processPaypalPayment -> error |
| ApexClass:BouquetPaymentControllerTest | External:Product2 | instantiation | setup |
| ApexClass:BouquetPaymentControllerTest | External:Contact | instantiation | setup |
| ApexClass:BouquetPaymentControllerTest | CustomObject:Bouquet_Order__c | instantiation | setup |
| ApexClass:BouquetPaymentControllerTest | CustomObject:Bouquet_Order_Item__c | instantiation | setup |
| ApexClass:BouquetPaymentControllerTest | External:ContentVersion | instantiation | setup |
| ApexClass:BouquetPaymentControllerTest | External:ContentDocumentLink | instantiation | setup |
| ApexClass:BouquetPaymentControllerTest | ApexClass:BouquetPaymentController | method-call | testProcessPaypalPayment -> processPaypalPayment |
| ApexClass:BouquetPaymentControllerTest | External:Product2 | type-reference | setup |
| ApexClass:BouquetPaymentControllerTest | External:Contact | type-reference | setup |
| ApexClass:BouquetPaymentControllerTest | CustomObject:Bouquet_Order__c | type-reference | setup |
| ApexClass:BouquetPaymentControllerTest | External:ContentVersion | type-reference | setup |
| ApexClass:BouquetPaymentControllerTest | CustomObject:Bouquet_Payment__c | generic-type | testProcessPaypalPayment |
| ApexClass:BouquetPaymentControllerTest | ApexClass:BouquetPaymentController | test-reference |  |
| ApexClass:BouquetPaymentService | ApexClass:PayPalGatewayHandler | instantiation | processPaypalPayment |
| ApexClass:BouquetPaymentService | ApexClass:IBouquetPaymentGateway | type-reference | processPaypalPayment |
| ApexClass:BouquetPaymentServiceTest | External:Product2 | instantiation | setup |
| ApexClass:BouquetPaymentServiceTest | External:Contact | instantiation | setup |
| ApexClass:BouquetPaymentServiceTest | CustomObject:Bouquet_Order__c | instantiation | setup |
| ApexClass:BouquetPaymentServiceTest | CustomObject:Bouquet_Order_Item__c | instantiation | setup |
| ApexClass:BouquetPaymentServiceTest | ApexClass:BouquetPaymentService | method-call | testProcessPaypalPaymentHappyPath -> processPaypalPayment |
| ApexClass:BouquetPaymentServiceTest | External:Product2 | type-reference | setup |
| ApexClass:BouquetPaymentServiceTest | External:Contact | type-reference | setup |
| ApexClass:BouquetPaymentServiceTest | CustomObject:Bouquet_Order__c | type-reference | setup |
| ApexClass:BouquetPaymentServiceTest | ApexClass:BouquetPaymentService | test-reference |  |
| ApexClass:BouquetPersistenceHandler | CustomObject:Bouquet_Order__c | instantiation |  |
| ApexClass:BouquetPersistenceHandler | CustomObject:Bouquet_Order_Item__c | instantiation | parseDate |
| ApexClass:BouquetPersistenceHandler | ApexClass:BouquetOrderRequestDTO | type-reference | createOrder |
| ApexClass:BouquetPersistenceHandler | CustomObject:Bouquet_Order__c | type-reference |  |
| ApexClass:BouquetPersistenceHandler | External:Product2 | type-reference | parseDate |
| ApexClass:BouquetPersistenceHandler | CustomObject:Bouquet_Order_Item__c | type-reference | parseDate |
| ApexClass:BouquetPersistenceHandler | ApexClass:IBouquetPersistenceHandler | implements |  |
| ApexClass:BouquetPricingEngine | ApexClass:IBouquetPricingEngine | implements |  |
| ApexClass:BouquetProductController | ApexClass:BouquetProductSelector | method-call | getAvailableProducts -> getAvailableProducts |
| ApexClass:BouquetProductController | ApexClass:BouquetLogger | method-call | getAvailableProducts -> error |
| ApexClass:BouquetProductController | ApexClass:BouquetProductSelector | method-call | getFeaturedProducts -> getFeaturedProducts |
| ApexClass:BouquetProductController | External:Product2 | generic-type |  |
| ApexClass:BouquetProductControllerTest | ApexClass:TestDataFactory | method-call | setup -> createTestProducts |
| ApexClass:BouquetProductControllerTest | ApexClass:BouquetProductController | method-call | testGetAvailableProductsFiltersAndSorting -> getAvailableProducts |
| ApexClass:BouquetProductControllerTest | ApexClass:BouquetProductController | method-call | testGetFeaturedProducts -> getFeaturedProducts |
| ApexClass:BouquetProductControllerTest | External:Product2 | generic-type | testGetAvailableProductsFiltersAndSorting |
| ApexClass:BouquetProductControllerTest | ApexClass:TestDataFactory | test-reference |  |
| ApexClass:BouquetProductControllerTest | ApexClass:BouquetProductController | test-reference |  |
| ApexClass:BouquetProductSelector | External:Product2 | generic-type |  |
| ApexClass:BouquetRegistrationHandler | ApexClass:BouquetUserService | method-call | createUser -> createUser |
| ApexClass:BouquetRegistrationHandler | ApexClass:BouquetUserService | method-call | updateUser -> updateUser |
| ApexClass:BouquetRegistrationHandler | External:UserData | type-reference | createUser |
| ApexClass:BouquetRegistrationHandler | External:Auth.RegistrationHandler | implements |  |
| ApexClass:BouquetRegistrationHandlerTest | External:Contact | instantiation |  |
| ApexClass:BouquetRegistrationHandlerTest | External:User | instantiation |  |
| ApexClass:BouquetRegistrationHandlerTest | ApexClass:BouquetRegistrationHandler | instantiation | testCreateUserNewContact |
| ApexClass:BouquetRegistrationHandlerTest | External:Contact | type-reference |  |
| ApexClass:BouquetRegistrationHandlerTest | External:User | type-reference |  |
| ApexClass:BouquetRegistrationHandlerTest | External:Profile | type-reference | setupTestData |
| ApexClass:BouquetRegistrationHandlerTest | ApexClass:BouquetRegistrationHandler | type-reference |  |
| ApexClass:BouquetRegistrationHandlerTest | External:UserData | type-reference |  |
| ApexClass:BouquetRegistrationHandlerTest | External:Contact | generic-type | testCreateUserNewContact |
| ApexClass:BouquetRegistrationHandlerTest | ApexClass:BouquetRegistrationHandler | test-reference |  |
| ApexClass:BouquetScheduleQueueable | CustomObject:Bouquet_Schedule_Response__e | instantiation | execute |
| ApexClass:BouquetScheduleQueueable | ApexClass:BouquetScheduler | method-call | execute -> rebuildSchedule |
| ApexClass:BouquetScheduleQueueable | ApexClass:BouquetLogger | method-call | execute -> error |
| ApexClass:BouquetScheduleQueueable | External:QueueableContext | type-reference | execute |
| ApexClass:BouquetScheduleQueueable | External:Queueable | implements |  |
| ApexClass:BouquetScheduler | External:SchedulerException | instantiation |  |
| ApexClass:BouquetScheduler | External:SchedulingResult | instantiation | scheduleOrdersInMemory |
| ApexClass:BouquetScheduler | External:PendingOrder | instantiation | scheduleOrdersInMemory |
| ApexClass:BouquetScheduler | External:ScheduledAllocation | instantiation | scheduleOrdersInMemory |
| ApexClass:BouquetScheduler | External:SchedulerData | instantiation | getSchedulerData |
| ApexClass:BouquetScheduler | External:OrderScheduleInput | instantiation | getSchedulerData |
| ApexClass:BouquetScheduler | CustomObject:Bouquet_Capacity__c | instantiation | getSchedulerData |
| ApexClass:BouquetScheduler | CustomObject:Bouquet_Capacity_Reservation__c | instantiation | getSchedulerData |
| ApexClass:BouquetScheduler | External:AcceptabilityResult | instantiation | checkCapacityPreview |
| ApexClass:BouquetScheduler | ApexClass:BouquetSettings | method-call | getProductionHoursPerDay |
| ApexClass:BouquetScheduler | ApexClass:BouquetLogger | method-call | logException -> log |
| ApexClass:BouquetScheduler | ApexClass:BouquetOrderSelector | method-call | getSchedulerData -> getSchedulableOrders |
| ApexClass:BouquetScheduler | ApexClass:BouquetOrderSelector | method-call | getSchedulerData -> getCapacityLimitsForDates |
| ApexClass:BouquetScheduler | ApexClass:BouquetOrderSelector | method-call | getSchedulerData -> getReservationsForDates |
| ApexClass:BouquetScheduler | External:SchedulerData | type-reference |  |
| ApexClass:BouquetScheduler | External:SchedulingResult | type-reference |  |
| ApexClass:BouquetScheduler | External:ScheduledAllocation | type-reference |  |
| ApexClass:BouquetScheduler | External:OrderScheduleInput | type-reference |  |
| ApexClass:BouquetScheduler | External:PendingOrder | type-reference | scheduleOrdersInMemory |
| ApexClass:BouquetScheduler | CustomObject:Bouquet_Capacity_Reservation__c | type-reference | getSchedulerData |
| ApexClass:BouquetScheduler | External:DmlException | type-reference | persistAllocations |
| ApexClass:BouquetScheduler | External:QueryException | type-reference | persistAllocations |
| ApexClass:BouquetScheduler | External:AcceptabilityResult | type-reference |  |
| ApexClass:BouquetScheduler | External:OrderScheduleInput | generic-type |  |
| ApexClass:BouquetScheduler | External:ScheduledAllocation | generic-type |  |
| ApexClass:BouquetScheduler | External:PendingOrder | generic-type | scheduleOrdersInMemory |
| ApexClass:BouquetScheduler | CustomObject:Bouquet_Order__c | generic-type | getSchedulerData |
| ApexClass:BouquetScheduler | CustomObject:Bouquet_Capacity__c | generic-type | getSchedulerData |
| ApexClass:BouquetScheduler | CustomObject:Bouquet_Capacity_Reservation__c | generic-type | getSchedulerData |
| ApexClass:BouquetScheduler | CustomObject:Bouquet_Scheduling_Job__c | generic-type | rebuildSchedule |
| ApexClass:BouquetSchedulerStressTest | External:Holiday | instantiation | insertTestData |
| ApexClass:BouquetSchedulerStressTest | External:Product2 | instantiation | insertTestData |
| ApexClass:BouquetSchedulerStressTest | External:Contact | instantiation | insertTestData |
| ApexClass:BouquetSchedulerStressTest | ApexClass:BouquetScheduler | method-call | buildInput -> OrderScheduleInput |
| ApexClass:BouquetSchedulerStressTest | ApexClass:BouquetScheduler | method-call | testHolidaySkipping -> scheduleOrdersInMemory |
| ApexClass:BouquetSchedulerStressTest | External:Product2 | type-reference | insertTestData |
| ApexClass:BouquetSchedulerStressTest | External:Contact | type-reference | insertTestData |
| ApexClass:BouquetSchedulerStressTest | External:OrderScheduleInput | type-reference |  |
| ApexClass:BouquetSchedulerStressTest | External:SchedulingResult | type-reference | assertNoHolidayAllocation |
| ApexClass:BouquetSchedulerStressTest | ApexClass:BouquetScheduler | test-reference |  |
| ApexClass:BouquetSchedulerTest | ApexClass:BouquetScheduler | method-call | scheduleOrdersInMemory_allocatesWithinCapacity -> OrderScheduleInput |
| ApexClass:BouquetSchedulerTest | ApexClass:BouquetScheduler | method-call | scheduleOrdersInMemory_allocatesWithinCapacity -> scheduleOrdersInMemory |
| ApexClass:BouquetSchedulerTest | External:OrderScheduleInput | type-reference | scheduleOrdersInMemory_allocatesWithinCapacity |
| ApexClass:BouquetSchedulerTest | External:SchedulingResult | type-reference | scheduleOrdersInMemory_allocatesWithinCapacity |
| ApexClass:BouquetSchedulerTest | ApexClass:BouquetScheduler | test-reference |  |
| ApexClass:BouquetSettings | CustomObject:Bouquet_Setting__mdt | method-call | getSetting -> getInstance |
| ApexClass:BouquetSettings | CustomObject:Bouquet_Setting__mdt | type-reference | getSetting |
| ApexClass:BouquetSettingsTest | ApexClass:BouquetSettings | method-call | testGetSettingAndProductionHours -> getSetting |
| ApexClass:BouquetSettingsTest | ApexClass:BouquetSettings | method-call | testGetSettingAndProductionHours -> getProductionHoursPerDay |
| ApexClass:BouquetSettingsTest | ApexClass:BouquetSettings | test-reference |  |
| ApexClass:BouquetTrackingController | ApexClass:IBouquetTrackingService | type-reference |  |
| ApexClass:BouquetTrackingControllerTest | External:Product2 | instantiation | setup |
| ApexClass:BouquetTrackingControllerTest | External:Contact | instantiation | setup |
| ApexClass:BouquetTrackingControllerTest | CustomObject:Bouquet_Order__c | instantiation | setup |
| ApexClass:BouquetTrackingControllerTest | CustomObject:Bouquet_Order_Item__c | instantiation | setup |
| ApexClass:BouquetTrackingControllerTest | External:ContentVersion | instantiation | setup |
| ApexClass:BouquetTrackingControllerTest | External:ContentDocumentLink | instantiation | setup |
| ApexClass:BouquetTrackingControllerTest | ApexClass:BouquetTrackingController | method-call | testGetOrderDetails -> getOrderDetails |
| ApexClass:BouquetTrackingControllerTest | ApexClass:BouquetTrackingController | method-call | testGetOrderFiles -> getOrderFiles |
| ApexClass:BouquetTrackingControllerTest | ApexClass:BouquetTrackingController | method-call | testTrackOrder -> trackOrder |
| ApexClass:BouquetTrackingControllerTest | External:Product2 | type-reference | setup |
| ApexClass:BouquetTrackingControllerTest | External:Contact | type-reference | setup |
| ApexClass:BouquetTrackingControllerTest | CustomObject:Bouquet_Order__c | type-reference | setup |
| ApexClass:BouquetTrackingControllerTest | External:ContentVersion | type-reference | setup |
| ApexClass:BouquetTrackingControllerTest | ApexClass:BouquetTrackingController | test-reference |  |
| ApexClass:BouquetTrackingService | ApexClass:BouquetException | instantiation | trackOrder |
| ApexClass:BouquetTrackingService | ApexClass:BouquetOrderSelector | method-call | trackOrder -> getOrderByNumberAndMobile |
| ApexClass:BouquetTrackingService | ApexClass:BouquetOrderSelector | method-call | getOrderDetails -> getOrderDetailsById |
| ApexClass:BouquetTrackingService | ApexClass:BouquetOrderSelector | method-call | getOrderFiles -> getPaymentFiles |
| ApexClass:BouquetTrackingService | CustomObject:Bouquet_Order__c | type-reference | trackOrder |
| ApexClass:BouquetTrackingService | External:ContentDocumentLink | generic-type | getOrderFiles |
| ApexClass:BouquetTrackingServiceImpl | ApexClass:BouquetTrackingService | method-call | trackOrder -> trackOrder |
| ApexClass:BouquetTrackingServiceImpl | ApexClass:BouquetLogger | method-call | trackOrder -> error |
| ApexClass:BouquetTrackingServiceImpl | ApexClass:BouquetTrackingService | method-call | getOrderDetails -> getOrderDetails |
| ApexClass:BouquetTrackingServiceImpl | ApexClass:BouquetTrackingService | method-call | getOrderFiles -> getOrderFiles |
| ApexClass:BouquetTrackingServiceImpl | ApexClass:IBouquetTrackingService | implements |  |
| ApexClass:BouquetTriggerTest | ApexClass:BouquetTriggerTestDataFactory | instantiation |  |
| ApexClass:BouquetTriggerTest | External:Order_Number__c | method-call | testOrderTriggerInsertAndNumberGeneration -> startsWith |
| ApexClass:BouquetTriggerTest | ApexClass:IBouquetTriggerTestDataFactory | type-reference |  |
| ApexClass:BouquetTriggerTest | External:Contact | type-reference | testOrderTriggerInsertAndNumberGeneration |
| ApexClass:BouquetTriggerTest | CustomObject:Bouquet_Order__c | type-reference | testOrderTriggerInsertAndNumberGeneration |
| ApexClass:BouquetTriggerTest | External:SaveResult | type-reference | testScheduleRequestTrigger |
| ApexClass:BouquetTriggerTest | ApexClass:IBouquetTriggerTestDataFactory | test-reference |  |
| ApexClass:BouquetTriggerTest | ApexClass:BouquetTriggerTestDataFactory | test-reference |  |
| ApexClass:BouquetTriggerTestDataFactory | External:Contact | instantiation |  |
| ApexClass:BouquetTriggerTestDataFactory | CustomObject:Bouquet_Order__c | instantiation |  |
| ApexClass:BouquetTriggerTestDataFactory | CustomObject:Bouquet_Schedule_Request__e | instantiation | createScheduleRequestEvent |
| ApexClass:BouquetTriggerTestDataFactory | CustomObject:Bouquet_Notification_Event__e | instantiation |  |
| ApexClass:BouquetTriggerTestDataFactory | External:Contact | type-reference |  |
| ApexClass:BouquetTriggerTestDataFactory | ApexClass:IBouquetTriggerTestDataFactory | implements |  |
| ApexClass:BouquetUserController | ApexClass:BouquetException | instantiation | getUserProfile |
| ApexClass:BouquetUserController | ApexClass:BouquetLogger | method-call | getUserProfile -> error |
| ApexClass:BouquetUserController | External:User | type-reference |  |
| ApexClass:BouquetUserController | External:Contact | type-reference | getUserProfile |
| ApexClass:BouquetUserController | External:User | generic-type | getUserProfile |
| ApexClass:BouquetUserController | External:Contact | generic-type | getUserProfile |
| ApexClass:BouquetUserController | CustomObject:Bouquet_Address__c | generic-type | getUserProfile |
| ApexClass:BouquetUserControllerTest | ApexClass:BouquetUserController | method-call | testGetUserProfileAndIsUserLoggedIn -> getUserProfile |
| ApexClass:BouquetUserControllerTest | ApexClass:BouquetUserController | test-reference |  |
| ApexClass:BouquetUserService | External:Contact | instantiation | createUser |
| ApexClass:BouquetUserService | ApexClass:BouquetException | instantiation | createUser |
| ApexClass:BouquetUserService | External:User | instantiation | createUser |
| ApexClass:BouquetUserService | ApexClass:BouquetSettings | method-call | createUser -> getSetting |
| ApexClass:BouquetUserService | External:UserData | type-reference | createUser |
| ApexClass:BouquetUserService | External:Contact | type-reference | createUser |
| ApexClass:BouquetUserService | External:Profile | type-reference | createUser |
| ApexClass:BouquetUserService | External:User | type-reference |  |
| ApexClass:BouquetUserService | External:Contact | generic-type | createUser |
| ApexClass:BouquetUserService | External:Profile | generic-type | createUser |
| ApexClass:BouquetValidator | External:Contact | instantiation | resolveCustomer |
| ApexClass:BouquetValidator | CustomObject:Bouquet_Address__c | instantiation | ensureAddressExists |
| ApexClass:BouquetValidator | ApexClass:BouquetOrderSelector | method-call | resolveCustomer -> getContactIdByUserId |
| ApexClass:BouquetValidator | ApexClass:BouquetOrderRequestDTO | type-reference | resolveCustomer |
| ApexClass:BouquetValidator | External:Contact | type-reference | resolveCustomer |
| ApexClass:BouquetValidator | CustomObject:Bouquet_Address__c | type-reference | ensureAddressExists |
| ApexClass:BouquetValidator | External:Contact | generic-type | resolveCustomer |
| ApexClass:BouquetValidator | CustomObject:Bouquet_Address__c | generic-type | ensureAddressExists |
| ApexClass:BouquetValidator | ApexClass:IBouquetValidator | implements |  |
| ApexClass:IBouquetCapacityRepository | CustomObject:Bouquet_Capacity__c | generic-type |  |
| ApexClass:IBouquetCapacityRepository | CustomObject:Bouquet_Capacity_Reservation__c | generic-type |  |
| ApexClass:IBouquetOrderDomainHelper | CustomObject:Bouquet_Order__c | type-reference |  |
| ApexClass:IBouquetOrderDomainHelper | CustomObject:Bouquet_Order__c | generic-type |  |
| ApexClass:IBouquetOrderFormService | ApexClass:BouquetOrderRequestDTO | type-reference |  |
| ApexClass:IBouquetOrderRepository | CustomObject:Bouquet_Order__c | generic-type |  |
| ApexClass:IBouquetOrderSelector | CustomObject:Bouquet_Order__c | generic-type |  |
| ApexClass:IBouquetOrderTriggerService | CustomObject:Bouquet_Order__c | generic-type |  |
| ApexClass:IBouquetPersistenceHandler | ApexClass:BouquetOrderRequestDTO | type-reference |  |
| ApexClass:IBouquetPersistenceHandler | CustomObject:Bouquet_Order__c | type-reference |  |
| ApexClass:IBouquetPersistenceHandler | External:Product2 | type-reference |  |
| ApexClass:IBouquetValidator | ApexClass:BouquetOrderRequestDTO | type-reference |  |
| ApexClass:OrderPanelDTO | CustomObject:Bouquet_Order__c | type-reference |  |
| ApexClass:PayPalGatewayHandler | ApexClass:IBouquetPaymentGateway | implements |  |
| ApexClass:TestDataFactory | External:Product2 | instantiation |  |
| ApexClass:TestDataFactory | External:Product2 | generic-type |  |
| ApexClass:TriggerHandler | External:LoopCount | instantiation |  |
| ApexClass:TriggerHandler | External:TriggerHandlerException | instantiation | increment |
| ApexClass:TriggerHandler | External:TriggerContext | type-reference |  |
| ApexTrigger:BouquetNotificationTrigger | ApexClass:BouquetEmailService | trigger-handler | sendTemplateEmail |

## Apex → Salesforce Data

| Apex | Target | Type | Evidence |
|---|---|---|---|
| ApexClass:BouquetCapacityController | CustomObject:Bouquet_Order__c | soql-object | SOQL FROM Bouquet_Order__c |
| ApexClass:BouquetCapacityController | CustomObject:Reservations__r | soql-object | SOQL FROM Reservations__r |
| ApexClass:BouquetCapacityController | CustomObject:Bouquet_Capacity__c | soql-object | SOQL FROM Bouquet_Capacity__c |
| ApexClass:BouquetCapacityController | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:BouquetCapacityControllerTest | CustomObject:Bouquet_Order__c | soql-object | SOQL FROM Bouquet_Order__c |
| ApexClass:BouquetCapacityControllerTest | CustomObject:Bouquet_Capacity_Reservation__c | soql-object | SOQL FROM Bouquet_Capacity_Reservation__c |
| ApexClass:BouquetCapacityControllerTest | CustomField:Bouquet_Capacity_Reservation__c.Completed_Hours__c | soql-field | Bouquet_Capacity_Reservation__c.Completed_Hours__c |
| ApexClass:BouquetCapacityControllerTest | CustomObject:Bouquet_Capacity__c | soql-object | SOQL FROM Bouquet_Capacity__c |
| ApexClass:BouquetCapacityControllerTest | CustomField:Bouquet_Capacity__c.Maximum_Hours__c | soql-field | Bouquet_Capacity__c.Maximum_Hours__c |
| ApexClass:BouquetCapacityControllerTest | CustomField:Bouquet_Capacity__c.Is_Overridden__c | soql-field | Bouquet_Capacity__c.Is_Overridden__c |
| ApexClass:BouquetCapacityControllerTest | CustomField:Bouquet_Capacity__c.Override_Reason__c | soql-field | Bouquet_Capacity__c.Override_Reason__c |
| ApexClass:BouquetCapacityRepository | CustomObject:Bouquet_Capacity__c | soql-object | SOQL FROM Bouquet_Capacity__c |
| ApexClass:BouquetCapacityRepository | CustomField:Bouquet_Capacity__c.Date__c | soql-field | Bouquet_Capacity__c.Date__c |
| ApexClass:BouquetCapacityRepository | CustomField:Bouquet_Capacity__c.Maximum_Hours__c | soql-field | Bouquet_Capacity__c.Maximum_Hours__c |
| ApexClass:BouquetCapacityRepository | CustomObject:Bouquet_Capacity_Reservation__c | soql-object | SOQL FROM Bouquet_Capacity_Reservation__c |
| ApexClass:BouquetCapacityRepository | CustomField:Bouquet_Capacity_Reservation__c.Bouquet_Order__c | soql-field | Bouquet_Capacity_Reservation__c.Bouquet_Order__c |
| ApexClass:BouquetCapacityRepository | CustomField:Bouquet_Capacity_Reservation__c.Planned_Hours__c | soql-field | Bouquet_Capacity_Reservation__c.Planned_Hours__c |
| ApexClass:BouquetCapacityRepository | CustomField:Bouquet_Capacity_Reservation__c.Completed_Hours__c | soql-field | Bouquet_Capacity_Reservation__c.Completed_Hours__c |
| ApexClass:BouquetCapacityService | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:BouquetCapacityService | CustomObject:Bouquet_Capacity_Reservation__c | soql-object | SOQL FROM Bouquet_Capacity_Reservation__c |
| ApexClass:BouquetCapacityService | CustomField:Bouquet_Capacity_Reservation__c.Planned_Hours__c | soql-field | Bouquet_Capacity_Reservation__c.Planned_Hours__c |
| ApexClass:BouquetCapacityService | CustomField:Bouquet_Capacity_Reservation__c.Completed_Hours__c | soql-field | Bouquet_Capacity_Reservation__c.Completed_Hours__c |
| ApexClass:BouquetCapacityService | CustomObject:Bouquet_Order__c | soql-object | SOQL FROM Bouquet_Order__c |
| ApexClass:BouquetCapacityService | CustomField:Bouquet_Order__c.Completed_Hours__c | soql-field | Bouquet_Order__c.Completed_Hours__c |
| ApexClass:BouquetContactRepository | CustomObject:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetEmailServiceImpl | CustomObject:EmailTemplate | soql-object | SOQL FROM EmailTemplate |
| ApexClass:BouquetEmailServiceTest | CustomObject:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetEmailServiceTest | CustomObject:Bouquet_Log__c | soql-object | SOQL FROM Bouquet_Log__c |
| ApexClass:BouquetEmailServiceTest | CustomField:Bouquet_Log__c.Message__c | soql-field | Bouquet_Log__c.Message__c |
| ApexClass:BouquetOrderControllerTest | CustomObject:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:BouquetOrderControllerTest | CustomObject:Bouquet_Order__c | soql-object | SOQL FROM Bouquet_Order__c |
| ApexClass:BouquetOrderControllerTest | CustomField:Bouquet_Order__c.Status__c | soql-field | Bouquet_Order__c.Status__c |
| ApexClass:BouquetOrderControllerTest | CustomField:Bouquet_Order__c.Tracking_Number__c | soql-field | Bouquet_Order__c.Tracking_Number__c |
| ApexClass:BouquetOrderFormControllerTest | CustomObject:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:BouquetOrderFormControllerTest | CustomObject:Product2 | soql-object | SOQL FROM Product2 |
| ApexClass:BouquetOrderFormControllerTest | CustomField:Product2.Price__c | soql-field | Product2.Price__c |
| ApexClass:BouquetOrderFormControllerTest | CustomObject:Bouquet_Order__c | soql-object | SOQL FROM Bouquet_Order__c |
| ApexClass:BouquetOrderFormControllerTest | CustomField:Bouquet_Order__c.Subtotal__c | soql-field | Bouquet_Order__c.Subtotal__c |
| ApexClass:BouquetOrderFormServiceTest | CustomObject:Bouquet_Order__c | soql-object | SOQL FROM Bouquet_Order__c |
| ApexClass:BouquetOrderFormServiceTest | CustomField:Bouquet_Order__c.Customer__c | soql-field | Bouquet_Order__c.Customer__c |
| ApexClass:BouquetOrderFormServiceTest | CustomField:Bouquet_Order__c.Subtotal__c | soql-field | Bouquet_Order__c.Subtotal__c |
| ApexClass:BouquetOrderFormServiceTest | CustomObject:Bouquet_Address__c | soql-object | SOQL FROM Bouquet_Address__c |
| ApexClass:BouquetOrderFormServiceTest | CustomObject:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetOrderFormTestFactory | CustomObject:Product2 | soql-object | SOQL FROM Product2 |
| ApexClass:BouquetOrderFormTestFactory | CustomField:Product2.Price__c | soql-field | Product2.Price__c |
| ApexClass:BouquetOrderFormTestFactory | CustomObject:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetOrderListControllerTest | CustomObject:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:BouquetOrderRepository | CustomObject:Bouquet_Order__c | soql-object | SOQL FROM Bouquet_Order__c |
| ApexClass:BouquetOrderRepository | CustomField:Bouquet_Order__c.Order_Number__c | soql-field | Bouquet_Order__c.Order_Number__c |
| ApexClass:BouquetOrderRepository | CustomField:Bouquet_Order__c.Status__c | soql-field | Bouquet_Order__c.Status__c |
| ApexClass:BouquetOrderRepository | CustomField:Bouquet_Order__c.Occasion_Date__c | soql-field | Bouquet_Order__c.Occasion_Date__c |
| ApexClass:BouquetOrderRepository | CustomField:Bouquet_Order__c.Total_Amount__c | soql-field | Bouquet_Order__c.Total_Amount__c |
| ApexClass:BouquetOrderRepository | CustomField:Bouquet_Order__c.Shipping_Date__c | soql-field | Bouquet_Order__c.Shipping_Date__c |
| ApexClass:BouquetOrderRepository | CustomField:Bouquet_Order__c.Production_Deadline__c | soql-field | Bouquet_Order__c.Production_Deadline__c |
| ApexClass:BouquetOrderRepository | CustomField:Bouquet_Order__c.Tracking_Number__c | soql-field | Bouquet_Order__c.Tracking_Number__c |
| ApexClass:BouquetOrderRepository | CustomField:Bouquet_Order__c.Shipping_Duration_Days__c | soql-field | Bouquet_Order__c.Shipping_Duration_Days__c |
| ApexClass:BouquetOrderRepository | CustomField:Bouquet_Order__c.Is_Urgent__c | soql-field | Bouquet_Order__c.Is_Urgent__c |
| ApexClass:BouquetOrderRepository | CustomField:Bouquet_Order__c.Required_Hours__c | soql-field | Bouquet_Order__c.Required_Hours__c |
| ApexClass:BouquetOrderRepository | CustomField:Bouquet_Order__c.Completed_Hours__c | soql-field | Bouquet_Order__c.Completed_Hours__c |
| ApexClass:BouquetOrderRepository | CustomObject:Order_Items__r | soql-object | SOQL FROM Order_Items__r |
| ApexClass:BouquetOrderSelector | CustomObject:ContentDocumentLink | soql-object | SOQL FROM ContentDocumentLink |
| ApexClass:BouquetOrderSelector | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:BouquetOrderSelector | CustomObject:Order_Items__r | soql-object | SOQL FROM Order_Items__r |
| ApexClass:BouquetOrderSelector | CustomObject:Capacity_Reservations__r | soql-object | SOQL FROM Capacity_Reservations__r |
| ApexClass:BouquetOrderSelector | CustomObject:Bouquet_Order__c | soql-object | SOQL FROM Bouquet_Order__c |
| ApexClass:BouquetOrderServiceTest | CustomObject:Bouquet_Order__c | soql-object | SOQL FROM Bouquet_Order__c |
| ApexClass:BouquetOrderServiceTest | CustomField:Bouquet_Order__c.Status__c | soql-field | Bouquet_Order__c.Status__c |
| ApexClass:BouquetOrderServiceTest | CustomField:Bouquet_Order__c.Shipping_Duration_Days__c | soql-field | Bouquet_Order__c.Shipping_Duration_Days__c |
| ApexClass:BouquetOrderServiceTest | CustomField:Bouquet_Order__c.Tracking_Number__c | soql-field | Bouquet_Order__c.Tracking_Number__c |
| ApexClass:BouquetPaymentControllerTest | CustomObject:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:BouquetPaymentControllerTest | CustomObject:Bouquet_Order__c | soql-object | SOQL FROM Bouquet_Order__c |
| ApexClass:BouquetPaymentControllerTest | CustomField:Bouquet_Order__c.Subtotal__c | soql-field | Bouquet_Order__c.Subtotal__c |
| ApexClass:BouquetPaymentControllerTest | CustomField:Bouquet_Order__c.Status__c | soql-field | Bouquet_Order__c.Status__c |
| ApexClass:BouquetPaymentControllerTest | CustomObject:Bouquet_Payment__c | soql-object | SOQL FROM Bouquet_Payment__c |
| ApexClass:BouquetPaymentControllerTest | CustomField:Bouquet_Payment__c.Transaction_Id__c | soql-field | Bouquet_Payment__c.Transaction_Id__c |
| ApexClass:BouquetPaymentControllerTest | CustomField:Bouquet_Payment__c.Payer_Email__c | soql-field | Bouquet_Payment__c.Payer_Email__c |
| ApexClass:BouquetPaymentControllerTest | CustomField:Bouquet_Payment__c.Payment_Method__c | soql-field | Bouquet_Payment__c.Payment_Method__c |
| ApexClass:BouquetPaymentServiceTest | CustomObject:Bouquet_Order__c | soql-object | SOQL FROM Bouquet_Order__c |
| ApexClass:BouquetPricingEngine | CustomObject:Product2 | soql-object | SOQL FROM Product2 |
| ApexClass:BouquetPricingEngine | CustomField:Product2.Price__c | soql-field | Product2.Price__c |
| ApexClass:BouquetPricingEngine | CustomField:Product2.Production_Hours__c | soql-field | Product2.Production_Hours__c |
| ApexClass:BouquetProductSelector | CustomObject:Product2 | soql-object | SOQL FROM Product2 |
| ApexClass:BouquetProductSelector | CustomField:Product2.Production_Hours__c | soql-field | Product2.Production_Hours__c |
| ApexClass:BouquetProductSelector | CustomField:Product2.Price__c | soql-field | Product2.Price__c |
| ApexClass:BouquetProductSelector | CustomField:Product2.Image_URL__c | soql-field | Product2.Image_URL__c |
| ApexClass:BouquetProductSelector | CustomField:Product2.Category__c | soql-field | Product2.Category__c |
| ApexClass:BouquetProductSelector | CustomField:Product2.Stock_Quantity__c | soql-field | Product2.Stock_Quantity__c |
| ApexClass:BouquetRegistrationHandlerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:BouquetRegistrationHandlerTest | CustomObject:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetRegistrationHandlerTest | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:BouquetScheduler | CustomObject:Holiday | soql-object | SOQL FROM Holiday |
| ApexClass:BouquetScheduler | CustomObject:Bouquet_Order_Item__c | soql-object | SOQL FROM Bouquet_Order_Item__c |
| ApexClass:BouquetScheduler | CustomField:Bouquet_Order_Item__c.Quantity__c | soql-field | Bouquet_Order_Item__c.Quantity__c |
| ApexClass:BouquetScheduler | CustomObject:Bouquet_Capacity__c | soql-object | SOQL FROM Bouquet_Capacity__c |
| ApexClass:BouquetScheduler | CustomField:Bouquet_Capacity__c.Date__c | soql-field | Bouquet_Capacity__c.Date__c |
| ApexClass:BouquetScheduler | CustomObject:Bouquet_Capacity_Reservation__c | soql-object | SOQL FROM Bouquet_Capacity_Reservation__c |
| ApexClass:BouquetScheduler | CustomField:Bouquet_Capacity_Reservation__c.Bouquet_Capacity__c | soql-field | Bouquet_Capacity_Reservation__c.Bouquet_Capacity__c |
| ApexClass:BouquetScheduler | CustomField:Bouquet_Capacity_Reservation__c.Bouquet_Order__c | soql-field | Bouquet_Capacity_Reservation__c.Bouquet_Order__c |
| ApexClass:BouquetScheduler | CustomField:Bouquet_Capacity_Reservation__c.Planned_Hours__c | soql-field | Bouquet_Capacity_Reservation__c.Planned_Hours__c |
| ApexClass:BouquetScheduler | CustomField:Bouquet_Capacity_Reservation__c.Completed_Hours__c | soql-field | Bouquet_Capacity_Reservation__c.Completed_Hours__c |
| ApexClass:BouquetScheduler | CustomObject:Bouquet_Scheduling_Job__c | soql-object | SOQL FROM Bouquet_Scheduling_Job__c |
| ApexClass:BouquetTrackingControllerTest | CustomObject:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:BouquetTrackingControllerTest | CustomObject:Bouquet_Order__c | soql-object | SOQL FROM Bouquet_Order__c |
| ApexClass:BouquetTrackingControllerTest | CustomField:Bouquet_Order__c.Order_Number__c | soql-field | Bouquet_Order__c.Order_Number__c |
| ApexClass:BouquetTriggerTest | CustomObject:Bouquet_Order__c | soql-object | SOQL FROM Bouquet_Order__c |
| ApexClass:BouquetTriggerTest | CustomField:Bouquet_Order__c.Order_Number__c | soql-field | Bouquet_Order__c.Order_Number__c |
| ApexClass:BouquetTriggerTest | CustomField:Bouquet_Order__c.Status__c | soql-field | Bouquet_Order__c.Status__c |
| ApexClass:BouquetUserController | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:BouquetUserController | CustomObject:Bouquet_Addresses__r | soql-object | SOQL FROM Bouquet_Addresses__r |
| ApexClass:BouquetUserController | CustomObject:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetUserService | CustomObject:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetUserService | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:BouquetValidator | CustomObject:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetValidator | CustomObject:Bouquet_Address__c | soql-object | SOQL FROM Bouquet_Address__c |
| ApexTrigger:BouquetNotificationTrigger | CustomObject:Bouquet_Notification_Event__e | trigger-object | Trigger BouquetNotificationTrigger on Bouquet_Notification_Event__e |
| ApexTrigger:BouquetOrderTrigger | CustomObject:Bouquet_Order__c | trigger-object | Trigger BouquetOrderTrigger on Bouquet_Order__c |
| ApexTrigger:BouquetScheduleRequestTrigger | CustomObject:Bouquet_Schedule_Request__e | trigger-object | Trigger BouquetScheduleRequestTrigger on Bouquet_Schedule_Request__e |

## Circular Dependencies

None detected.

## High Risk Components

| Component | Type | Fan-In | Fan-Out | Risk | Reasons |
|---|---|---:|---:|---|---|
| BouquetOrderController | ApexClass | 9 | 13 | HIGH | high fan-in, high fan-out, high coupling, unresolved references, direct LWC consumer |
| BouquetScheduler | ApexClass | 9 | 41 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| BouquetOrderSelector | ApexClass | 13 | 16 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| BouquetLogger | ApexClass | 19 | 9 | HIGH | high fan-in, high coupling, unresolved references, direct LWC consumer |
| BouquetCapacityController | ApexClass | 7 | 20 | HIGH | high fan-out, high coupling, unresolved references, direct LWC consumer |
| BouquetCapacityService | ApexClass | 2 | 19 | HIGH | high fan-out, high coupling, unresolved references |
| BouquetOrderRepository | ApexClass | 1 | 16 | HIGH | high fan-out, high coupling, unresolved references |
| BouquetOrderFormTestFactory | ApexClass | 5 | 12 | HIGH | high fan-out, high coupling, unresolved references |
| Bouquet_Order__c | Object | 66 | 0 | HIGH | high fan-in, high coupling |
| Contact | External | 39 | 0 | HIGH | high fan-in, high coupling |
| Product2 | External | 27 | 0 | HIGH | high fan-in, high coupling |
| BouquetOrderControllerTest | ApexClass | 0 | 23 | HIGH | high fan-out, high coupling, unresolved references |
| BouquetOrderFormControllerTest | ApexClass | 0 | 22 | HIGH | high fan-out, high coupling, unresolved references |
| BouquetCapacityControllerTest | ApexClass | 0 | 21 | HIGH | high fan-out, high coupling, unresolved references |
| BouquetOrderFormServiceTest | ApexClass | 0 | 21 | HIGH | high fan-out, high coupling, unresolved references |
| BouquetPaymentControllerTest | ApexClass | 0 | 21 | HIGH | high fan-out, high coupling, unresolved references |
| BouquetOrderServiceTest | ApexClass | 0 | 17 | HIGH | high fan-out, high coupling, unresolved references |
| BouquetTrackingControllerTest | ApexClass | 0 | 17 | HIGH | high fan-out, high coupling, unresolved references |
| BouquetOrderRequestDTO | ApexClass | 16 | 0 | HIGH | high fan-in, high coupling |
| Bouquet_Capacity__c | Object | 16 | 0 | HIGH | high fan-in, high coupling |
| BouquetUserController | ApexClass | 3 | 10 | HIGH | high fan-out, unresolved references, direct LWC consumer |
