# Salesforce Dependency Report

## LWC → Apex

| LWC | Apex | Method |
|---|---|---|
| LWC:booking-list | ApexClass:BookingController | getAllBookings |
| LWC:booking-list | ApexClass:BookingController | deleteBooking |
| LWC:food-landing-page | ApexClass:PlanController | getAllPlans |
| LWC:food-landing-page | ApexClass:ReviewController | getAllReviews |
| LWC:plan-admin | ApexClass:PlanController | getAllPlans |
| LWC:plan-admin | ApexClass:PlanController | createPlan |
| LWC:plan-admin | ApexClass:PlanController | updatePlan |
| LWC:plan-admin | ApexClass:PlanController | deletePlan |
| LWC:plan-detail | ApexClass:PlanController | getPlan |
| LWC:plan-detail | ApexClass:ReviewController | getAllReviews |
| LWC:plan-detail | ApexClass:ReviewController | createReview |
| LWC:plan-detail | ApexClass:ReviewController | deleteReview |
| LWC:plan-list | ApexClass:PlanController | getAllPlans |

## LWC → LWC

| Parent | Child | Type |
|---|---|---|

## Apex → Apex

| From | To | Type | Method |
|---|---|---|---|
| ApexClass:BookingController | Object:Booking__c | type-reference |  |
| ApexClass:BookingController | Object:Booking__c | generic-type |  |
| ApexClass:BookingControllerTest | Object:Plan__c | instantiation | setupData |
| ApexClass:BookingControllerTest | Object:Booking__c | instantiation | setupData |
| ApexClass:BookingControllerTest | ApexClass:BookingController | method-call | testGetAllBookings -> getAllBookings |
| ApexClass:BookingControllerTest | ApexClass:BookingController | method-call | testGetBooking -> getBooking |
| ApexClass:BookingControllerTest | ApexClass:BookingController | method-call | testCreateBooking -> createBooking |
| ApexClass:BookingControllerTest | ApexClass:BookingController | method-call | testDeleteBooking -> deleteBooking |
| ApexClass:BookingControllerTest | Object:Plan__c | type-reference | setupData |
| ApexClass:BookingControllerTest | Object:Booking__c | type-reference | setupData |
| ApexClass:BookingControllerTest | Object:Booking__c | generic-type | testGetAllBookings |
| ApexClass:BookingControllerTest | ApexClass:BookingController | test-reference |  |
| ApexClass:PlanController | Object:Plan__c | type-reference |  |
| ApexClass:PlanController | Object:Plan__c | generic-type |  |
| ApexClass:PlanControllerTest | Object:Plan__c | instantiation | setupData |
| ApexClass:PlanControllerTest | ApexClass:PlanController | method-call | testGetAllPlans -> getAllPlans |
| ApexClass:PlanControllerTest | ApexClass:PlanController | method-call | testGetPlan -> getPlan |
| ApexClass:PlanControllerTest | ApexClass:PlanController | method-call | testCreatePlan -> createPlan |
| ApexClass:PlanControllerTest | ApexClass:PlanController | method-call | testUpdatePlan -> updatePlan |
| ApexClass:PlanControllerTest | ApexClass:PlanController | method-call | testDeletePlan -> deletePlan |
| ApexClass:PlanControllerTest | ApexClass:PlanController | method-call | testTop3Plans -> top3Plans |
| ApexClass:PlanControllerTest | Object:Plan__c | type-reference | setupData |
| ApexClass:PlanControllerTest | Object:Plan__c | generic-type | setupData |
| ApexClass:PlanControllerTest | ApexClass:PlanController | test-reference |  |
| ApexClass:ReviewController | Object:Review__c | type-reference |  |
| ApexClass:ReviewController | Object:Review__c | generic-type |  |
| ApexClass:ReviewControllerTest | Object:Plan__c | instantiation | setupData |
| ApexClass:ReviewControllerTest | Object:Review__c | instantiation | setupData |
| ApexClass:ReviewControllerTest | ApexClass:ReviewController | method-call | testGetAllReviews -> getAllReviews |
| ApexClass:ReviewControllerTest | ApexClass:ReviewController | method-call | testGetReview -> getReview |
| ApexClass:ReviewControllerTest | ApexClass:ReviewController | method-call | testCreateReview -> createReview |
| ApexClass:ReviewControllerTest | ApexClass:ReviewController | method-call | testUpdateReview -> updateReview |
| ApexClass:ReviewControllerTest | ApexClass:ReviewController | method-call | testDeleteReview -> deleteReview |
| ApexClass:ReviewControllerTest | ApexClass:ReviewController | method-call | testGetPlanReviews -> getPlanReviews |
| ApexClass:ReviewControllerTest | Object:Plan__c | type-reference | setupData |
| ApexClass:ReviewControllerTest | Object:Review__c | type-reference | setupData |
| ApexClass:ReviewControllerTest | Object:Review__c | generic-type | testGetAllReviews |
| ApexClass:ReviewControllerTest | ApexClass:ReviewController | test-reference |  |
| ApexClass:ReviewTriggerHandler | Object:Plan__c | instantiation | updatePlanRatings |
| ApexClass:ReviewTriggerHandler | Object:Review__c | generic-type | updatePlanRatings |
| ApexClass:ReviewTriggerHandler | Object:Plan__c | generic-type | updatePlanRatings |
| ApexClass:ReviewTriggerHandlerTest | Object:Plan__c | instantiation | testReviewTriggerRatingCalculation |
| ApexClass:ReviewTriggerHandlerTest | Object:Review__c | instantiation | testReviewTriggerRatingCalculation |
| ApexClass:ReviewTriggerHandlerTest | Object:Plan__c | type-reference | testReviewTriggerRatingCalculation |
| ApexClass:ReviewTriggerHandlerTest | Object:Review__c | type-reference | testReviewTriggerRatingCalculation |
| Trigger:ReviewTrigger | ApexClass:ReviewTriggerHandler | trigger-handler | updatePlanRatings |

## Apex → Salesforce Data

| Apex | Target | Type | Evidence |
|---|---|---|---|
| ApexClass:BookingController | Object:Booking__c | soql-object | SOQL FROM Booking__c |
| ApexClass:BookingController | Field:Booking__c.Plan__c | soql-field | Booking__c.Plan__c |
| ApexClass:BookingController | Field:Booking__c.Price__c | soql-field | Booking__c.Price__c |
| ApexClass:BookingController | Field:Booking__c.Status__c | soql-field | Booking__c.Status__c |
| ApexClass:BookingControllerTest | Object:Booking__c | soql-object | SOQL FROM Booking__c |
| ApexClass:BookingControllerTest | Object:Plan__c | soql-object | SOQL FROM Plan__c |
| ApexClass:PlanController | Object:Plan__c | soql-object | SOQL FROM Plan__c |
| ApexClass:PlanController | Field:Plan__c.Price__c | soql-field | Plan__c.Price__c |
| ApexClass:PlanController | Field:Plan__c.Duration__c | soql-field | Plan__c.Duration__c |
| ApexClass:PlanController | Field:Plan__c.Discount__c | soql-field | Plan__c.Discount__c |
| ApexClass:PlanController | Field:Plan__c.RatingsAverage__c | soql-field | Plan__c.RatingsAverage__c |
| ApexClass:PlanControllerTest | Object:Plan__c | soql-object | SOQL FROM Plan__c |
| ApexClass:PlanControllerTest | Field:Plan__c.Price__c | soql-field | Plan__c.Price__c |
| ApexClass:ReviewController | Object:Review__c | soql-object | SOQL FROM Review__c |
| ApexClass:ReviewController | Field:Review__c.Rating__c | soql-field | Review__c.Rating__c |
| ApexClass:ReviewController | Field:Review__c.Review__c | soql-field | Review__c.Review__c |
| ApexClass:ReviewController | Field:Review__c.Plan__c | soql-field | Review__c.Plan__c |
| ApexClass:ReviewControllerTest | Object:Review__c | soql-object | SOQL FROM Review__c |
| ApexClass:ReviewControllerTest | Field:Review__c.Rating__c | soql-field | Review__c.Rating__c |
| ApexClass:ReviewControllerTest | Object:Plan__c | soql-object | SOQL FROM Plan__c |
| ApexClass:ReviewTriggerHandler | Object:Review__c | soql-object | SOQL FROM Review__c |
| ApexClass:ReviewTriggerHandler | Field:Review__c.Plan__c | soql-field | Review__c.Plan__c |
| ApexClass:ReviewTriggerHandlerTest | Object:Plan__c | soql-object | SOQL FROM Plan__c |
| ApexClass:ReviewTriggerHandlerTest | Field:Plan__c.RatingsAverage__c | soql-field | Plan__c.RatingsAverage__c |
| Trigger:ReviewTrigger | Object:Review__c | trigger-object | Trigger ReviewTrigger on Review__c |

## Circular Dependencies

None detected.

## High Risk Components

| Component | Type | Fan-In | Fan-Out | Risk | Reasons |
|---|---|---:|---:|---|---|
| PlanController | ApexClass | 14 | 7 | HIGH | high fan-in, high coupling, direct LWC consumer |
| ReviewController | ApexClass | 11 | 6 | HIGH | high fan-in, high coupling, direct LWC consumer |
| Plan__c | Object | 18 | 0 | HIGH | high fan-in, high coupling |
