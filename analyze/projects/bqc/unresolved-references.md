# Unresolved Dependency References

These were detected in source but could not be resolved to a local symbol.

| From | To | Type | Evidence |
|---|---|---|---|
| ApexClass:BouquetCapacityController | External:CapacityRow | instantiation | new CapacityRow() |
| ApexClass:BouquetCapacityController | External:OrderReservation | instantiation | new OrderReservation() |
| ApexClass:BouquetCapacityController | External:CapacityRow | type-reference | CapacityRow |
| ApexClass:BouquetCapacityController | External:OrderReservation | type-reference | OrderReservation |
| ApexClass:BouquetCapacityController | External:OrderReservation | generic-type | <OrderReservation> |
| ApexClass:BouquetCapacityController | External:CapacityRow | generic-type | <CapacityRow> |
| ApexClass:BouquetCapacityController | External:Profile | generic-type | <Profile> |
| ApexClass:BouquetCapacityController | External:Object:Reservations__r | soql-object | SOQL FROM Reservations__r |
| ApexClass:BouquetCapacityController | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:BouquetCapacityControllerTest | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetCapacityControllerTest | External:Contact | type-reference | Contact |
| ApexClass:BouquetCapacityControllerTest | External:OrderReservation | type-reference | OrderReservation |
| ApexClass:BouquetCapacityService | External:UpsertResult | type-reference | UpsertResult |
| ApexClass:BouquetCapacityService | External:Profile | generic-type | <Profile> |
| ApexClass:BouquetCapacityService | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:BouquetContactRepository | External:Object:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetEmailServiceImpl | External:EmailTemplate | type-reference | EmailTemplate |
| ApexClass:BouquetEmailServiceImpl | External:SingleEmailMessage | type-reference | SingleEmailMessage |
| ApexClass:BouquetEmailServiceImpl | External:EmailException | type-reference | EmailException |
| ApexClass:BouquetEmailServiceImpl | External:EmailTemplate | generic-type | <EmailTemplate> |
| ApexClass:BouquetEmailServiceImpl | External:Object:EmailTemplate | soql-object | SOQL FROM EmailTemplate |
| ApexClass:BouquetEmailServiceTest | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetEmailServiceTest | External:Contact | type-reference | Contact |
| ApexClass:BouquetEmailServiceTest | External:Object:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetException | External:Exception | extends | extends Exception |
| ApexClass:BouquetLogger | External:INFO | method-call | INFO.name() |
| ApexClass:BouquetLogger | External:Severity | type-reference | Severity |
| ApexClass:BouquetLogger | External:JSONException | type-reference | JSONException |
| ApexClass:BouquetOrderController | External:LastModifiedDate | method-call | LastModifiedDate.getTime() |
| ApexClass:BouquetOrderController | External:AcceptabilityResult | type-reference | AcceptabilityResult |
| ApexClass:BouquetOrderControllerTest | External:Product2 | instantiation | new Product2() |
| ApexClass:BouquetOrderControllerTest | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetOrderControllerTest | External:ContentVersion | instantiation | new ContentVersion() |
| ApexClass:BouquetOrderControllerTest | External:ContentDocumentLink | instantiation | new ContentDocumentLink() |
| ApexClass:BouquetOrderControllerTest | External:Product2 | type-reference | Product2 |
| ApexClass:BouquetOrderControllerTest | External:Contact | type-reference | Contact |
| ApexClass:BouquetOrderControllerTest | External:ContentVersion | type-reference | ContentVersion |
| ApexClass:BouquetOrderControllerTest | External:Object:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:BouquetOrderDomainHelper | External:SCHEDULABLE_STATUSES | method-call | SCHEDULABLE_STATUSES.contains() |
| ApexClass:BouquetOrderDomainTest | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetOrderDomainTest | External:Order_Number__c | method-call | Order_Number__c.startsWith() |
| ApexClass:BouquetOrderDomainTest | External:Contact | type-reference | Contact |
| ApexClass:BouquetOrderFormControllerTest | External:Product2 | instantiation | new Product2() |
| ApexClass:BouquetOrderFormControllerTest | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetOrderFormControllerTest | External:ContentVersion | instantiation | new ContentVersion() |
| ApexClass:BouquetOrderFormControllerTest | External:ContentDocumentLink | instantiation | new ContentDocumentLink() |
| ApexClass:BouquetOrderFormControllerTest | External:Product2 | type-reference | Product2 |
| ApexClass:BouquetOrderFormControllerTest | External:Contact | type-reference | Contact |
| ApexClass:BouquetOrderFormControllerTest | External:ContentVersion | type-reference | ContentVersion |
| ApexClass:BouquetOrderFormControllerTest | External:Object:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:BouquetOrderFormControllerTest | External:Object:Product2 | soql-object | SOQL FROM Product2 |
| ApexClass:BouquetOrderFormServiceImpl | External:Savepoint | type-reference | Savepoint |
| ApexClass:BouquetOrderFormServiceImpl | External:Product2 | type-reference | Product2 |
| ApexClass:BouquetOrderFormServiceTest | External:Product2 | type-reference | Product2 |
| ApexClass:BouquetOrderFormServiceTest | External:Contact | type-reference | Contact |
| ApexClass:BouquetOrderFormServiceTest | External:Object:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetOrderFormTestFactory | External:Product2 | instantiation | new Product2() |
| ApexClass:BouquetOrderFormTestFactory | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetOrderFormTestFactory | External:Product2 | type-reference | Product2 |
| ApexClass:BouquetOrderFormTestFactory | External:Contact | type-reference | Contact |
| ApexClass:BouquetOrderFormTestFactory | External:Object:Product2 | soql-object | SOQL FROM Product2 |
| ApexClass:BouquetOrderFormTestFactory | External:Object:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetOrderListControllerTest | External:Product2 | instantiation | new Product2() |
| ApexClass:BouquetOrderListControllerTest | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetOrderListControllerTest | External:ContentVersion | instantiation | new ContentVersion() |
| ApexClass:BouquetOrderListControllerTest | External:ContentDocumentLink | instantiation | new ContentDocumentLink() |
| ApexClass:BouquetOrderListControllerTest | External:Product2 | type-reference | Product2 |
| ApexClass:BouquetOrderListControllerTest | External:Contact | type-reference | Contact |
| ApexClass:BouquetOrderListControllerTest | External:ContentVersion | type-reference | ContentVersion |
| ApexClass:BouquetOrderListControllerTest | External:Object:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:BouquetOrderRepository | External:CreatedDate | type-reference | CreatedDate |
| ApexClass:BouquetOrderRepository | External:Object:Order_Items__r | soql-object | SOQL FROM Order_Items__r |
| ApexClass:BouquetOrderSelector | External:ContentDocumentLink | generic-type | <ContentDocumentLink> |
| ApexClass:BouquetOrderSelector | External:User | generic-type | <User> |
| ApexClass:BouquetOrderSelector | External:Object:ContentDocumentLink | soql-object | SOQL FROM ContentDocumentLink |
| ApexClass:BouquetOrderSelector | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:BouquetOrderSelector | External:Object:Order_Items__r | soql-object | SOQL FROM Order_Items__r |
| ApexClass:BouquetOrderSelector | External:Object:Capacity_Reservations__r | soql-object | SOQL FROM Capacity_Reservations__r |
| ApexClass:BouquetOrderServiceTest | External:Product2 | instantiation | new Product2() |
| ApexClass:BouquetOrderServiceTest | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetOrderServiceTest | External:Product2 | type-reference | Product2 |
| ApexClass:BouquetOrderServiceTest | External:Contact | type-reference | Contact |
| ApexClass:BouquetPaymentControllerTest | External:Product2 | instantiation | new Product2() |
| ApexClass:BouquetPaymentControllerTest | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetPaymentControllerTest | External:ContentVersion | instantiation | new ContentVersion() |
| ApexClass:BouquetPaymentControllerTest | External:ContentDocumentLink | instantiation | new ContentDocumentLink() |
| ApexClass:BouquetPaymentControllerTest | External:Product2 | type-reference | Product2 |
| ApexClass:BouquetPaymentControllerTest | External:Contact | type-reference | Contact |
| ApexClass:BouquetPaymentControllerTest | External:ContentVersion | type-reference | ContentVersion |
| ApexClass:BouquetPaymentControllerTest | External:Object:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:BouquetPaymentServiceTest | External:Product2 | instantiation | new Product2() |
| ApexClass:BouquetPaymentServiceTest | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetPaymentServiceTest | External:Product2 | type-reference | Product2 |
| ApexClass:BouquetPaymentServiceTest | External:Contact | type-reference | Contact |
| ApexClass:BouquetPersistenceHandler | External:Product2 | type-reference | Product2 |
| ApexClass:BouquetPricingEngine | External:Object:Product2 | soql-object | SOQL FROM Product2 |
| ApexClass:BouquetProductController | External:Product2 | generic-type | <Product2> |
| ApexClass:BouquetProductControllerTest | External:Product2 | generic-type | <Product2> |
| ApexClass:BouquetProductSelector | External:Product2 | generic-type | <Product2> |
| ApexClass:BouquetProductSelector | External:Object:Product2 | soql-object | SOQL FROM Product2 |
| ApexClass:BouquetRegistrationHandler | External:UserData | type-reference | UserData |
| ApexClass:BouquetRegistrationHandler | External:Auth.RegistrationHandler | implements | implements Auth.RegistrationHandler |
| ApexClass:BouquetRegistrationHandlerTest | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetRegistrationHandlerTest | External:User | instantiation | new User() |
| ApexClass:BouquetRegistrationHandlerTest | External:Contact | type-reference | Contact |
| ApexClass:BouquetRegistrationHandlerTest | External:User | type-reference | User |
| ApexClass:BouquetRegistrationHandlerTest | External:Profile | type-reference | Profile |
| ApexClass:BouquetRegistrationHandlerTest | External:UserData | type-reference | UserData |
| ApexClass:BouquetRegistrationHandlerTest | External:Contact | generic-type | <Contact> |
| ApexClass:BouquetRegistrationHandlerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:BouquetRegistrationHandlerTest | External:Object:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetRegistrationHandlerTest | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:BouquetScheduleQueueable | External:QueueableContext | type-reference | QueueableContext |
| ApexClass:BouquetScheduleQueueable | External:Queueable | implements | implements Queueable |
| ApexClass:BouquetScheduler | External:SchedulerException | instantiation | new SchedulerException() |
| ApexClass:BouquetScheduler | External:SchedulingResult | instantiation | new SchedulingResult() |
| ApexClass:BouquetScheduler | External:PendingOrder | instantiation | new PendingOrder() |
| ApexClass:BouquetScheduler | External:ScheduledAllocation | instantiation | new ScheduledAllocation() |
| ApexClass:BouquetScheduler | External:SchedulerData | instantiation | new SchedulerData() |
| ApexClass:BouquetScheduler | External:OrderScheduleInput | instantiation | new OrderScheduleInput() |
| ApexClass:BouquetScheduler | External:AcceptabilityResult | instantiation | new AcceptabilityResult() |
| ApexClass:BouquetScheduler | External:SchedulerData | type-reference | SchedulerData |
| ApexClass:BouquetScheduler | External:SchedulingResult | type-reference | SchedulingResult |
| ApexClass:BouquetScheduler | External:ScheduledAllocation | type-reference | ScheduledAllocation |
| ApexClass:BouquetScheduler | External:OrderScheduleInput | type-reference | OrderScheduleInput |
| ApexClass:BouquetScheduler | External:PendingOrder | type-reference | PendingOrder |
| ApexClass:BouquetScheduler | External:DmlException | type-reference | DmlException |
| ApexClass:BouquetScheduler | External:QueryException | type-reference | QueryException |
| ApexClass:BouquetScheduler | External:AcceptabilityResult | type-reference | AcceptabilityResult |
| ApexClass:BouquetScheduler | External:OrderScheduleInput | generic-type | <OrderScheduleInput> |
| ApexClass:BouquetScheduler | External:ScheduledAllocation | generic-type | <ScheduledAllocation> |
| ApexClass:BouquetScheduler | External:PendingOrder | generic-type | <PendingOrder> |
| ApexClass:BouquetScheduler | External:Object:Holiday | soql-object | SOQL FROM Holiday |
| ApexClass:BouquetSchedulerStressTest | External:Holiday | instantiation | new Holiday() |
| ApexClass:BouquetSchedulerStressTest | External:Product2 | instantiation | new Product2() |
| ApexClass:BouquetSchedulerStressTest | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetSchedulerStressTest | External:Product2 | type-reference | Product2 |
| ApexClass:BouquetSchedulerStressTest | External:Contact | type-reference | Contact |
| ApexClass:BouquetSchedulerStressTest | External:OrderScheduleInput | type-reference | OrderScheduleInput |
| ApexClass:BouquetSchedulerStressTest | External:SchedulingResult | type-reference | SchedulingResult |
| ApexClass:BouquetSchedulerTest | External:OrderScheduleInput | type-reference | OrderScheduleInput |
| ApexClass:BouquetSchedulerTest | External:SchedulingResult | type-reference | SchedulingResult |
| ApexClass:BouquetTrackingControllerTest | External:Product2 | instantiation | new Product2() |
| ApexClass:BouquetTrackingControllerTest | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetTrackingControllerTest | External:ContentVersion | instantiation | new ContentVersion() |
| ApexClass:BouquetTrackingControllerTest | External:ContentDocumentLink | instantiation | new ContentDocumentLink() |
| ApexClass:BouquetTrackingControllerTest | External:Product2 | type-reference | Product2 |
| ApexClass:BouquetTrackingControllerTest | External:Contact | type-reference | Contact |
| ApexClass:BouquetTrackingControllerTest | External:ContentVersion | type-reference | ContentVersion |
| ApexClass:BouquetTrackingControllerTest | External:Object:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:BouquetTrackingService | External:ContentDocumentLink | generic-type | <ContentDocumentLink> |
| ApexClass:BouquetTriggerTest | External:Order_Number__c | method-call | Order_Number__c.startsWith() |
| ApexClass:BouquetTriggerTest | External:Contact | type-reference | Contact |
| ApexClass:BouquetTriggerTest | External:SaveResult | type-reference | SaveResult |
| ApexClass:BouquetTriggerTestDataFactory | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetTriggerTestDataFactory | External:Contact | type-reference | Contact |
| ApexClass:BouquetUserController | External:User | type-reference | User |
| ApexClass:BouquetUserController | External:Contact | type-reference | Contact |
| ApexClass:BouquetUserController | External:User | generic-type | <User> |
| ApexClass:BouquetUserController | External:Contact | generic-type | <Contact> |
| ApexClass:BouquetUserController | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:BouquetUserController | External:Object:Bouquet_Addresses__r | soql-object | SOQL FROM Bouquet_Addresses__r |
| ApexClass:BouquetUserController | External:Object:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetUserService | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetUserService | External:User | instantiation | new User() |
| ApexClass:BouquetUserService | External:UserData | type-reference | UserData |
| ApexClass:BouquetUserService | External:Contact | type-reference | Contact |
| ApexClass:BouquetUserService | External:Profile | type-reference | Profile |
| ApexClass:BouquetUserService | External:User | type-reference | User |
| ApexClass:BouquetUserService | External:Contact | generic-type | <Contact> |
| ApexClass:BouquetUserService | External:Profile | generic-type | <Profile> |
| ApexClass:BouquetUserService | External:Object:Contact | soql-object | SOQL FROM Contact |
| ApexClass:BouquetUserService | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:BouquetValidator | External:Contact | instantiation | new Contact() |
| ApexClass:BouquetValidator | External:Contact | type-reference | Contact |
| ApexClass:BouquetValidator | External:Contact | generic-type | <Contact> |
| ApexClass:BouquetValidator | External:Object:Contact | soql-object | SOQL FROM Contact |
| ApexClass:IBouquetPersistenceHandler | External:Product2 | type-reference | Product2 |
| ApexClass:TestDataFactory | External:Product2 | instantiation | new Product2() |
| ApexClass:TestDataFactory | External:Product2 | generic-type | <Product2> |
| ApexClass:TriggerHandler | External:LoopCount | instantiation | new LoopCount() |
| ApexClass:TriggerHandler | External:TriggerHandlerException | instantiation | new TriggerHandlerException() |
| ApexClass:TriggerHandler | External:TriggerContext | type-reference | TriggerContext |
