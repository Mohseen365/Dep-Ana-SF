# Salesforce Dependency Report

## LWC → Apex

| LWC | Apex | Method |
|---|---|---|
| LWC:banner | ApexClass:MovieController | getPopularMovies |
| LWC:favourites | ApexClass:MovieController | getMovieDetails |
| LWC:movie-list | ApexClass:MovieController | getPopularMovies |
| LWC:movie-list | ApexClass:MovieController | searchMovies |
| LWC:movie-list | ApexClass:MovieController | getMovieDetails |

## LWC → LWC

| Parent | Child | Type |
|---|---|---|
| LWC:movie-app-container | LWC:navbar | lwc-template-child |
| LWC:movie-app-container | LWC:banner | lwc-template-child |
| LWC:movie-app-container | LWC:movie-list | lwc-template-child |
| LWC:movie-app-container | LWC:favourites | lwc-template-child |

## Apex → Apex

| From | To | Type | Method |
|---|---|---|---|
| ApexClass:MovieControllerHttpMock | External:HttpCalloutMock | implements |  |
| ApexClass:MovieControllerTest | ApexClass:MovieControllerHttpMock | instantiation | testGetPopularMoviesSuccess |
| ApexClass:MovieControllerTest | ApexClass:MovieController | method-call | testGetPopularMoviesSuccess -> getPopularMovies |
| ApexClass:MovieControllerTest | ApexClass:MovieController | method-call | testSearchMoviesSuccess -> searchMovies |
| ApexClass:MovieControllerTest | ApexClass:MovieController | method-call | testGetMovieDetailsSuccess -> getMovieDetails |
| ApexClass:MovieControllerTest | ApexClass:MovieControllerHttpMock | test-reference |  |
| ApexClass:MovieControllerTest | ApexClass:MovieController | test-reference |  |

## Apex → Salesforce Data

| Apex | Target | Type | Evidence |
|---|---|---|---|

## Circular Dependencies

None detected.

## High Risk Components

| Component | Type | Fan-In | Fan-Out | Risk | Reasons |
|---|---|---:|---:|---|---|
