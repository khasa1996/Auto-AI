#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update test_result.md before calling the testing agent
#    - Add implementation details to the status_history
#    - Set needs_retesting to true for tasks that need testing
#    - Update the test_plan section to guide testing priorities
#    - Add a message to agent_communication explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When the user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If the user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where we are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios or edge cases to focus on
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================


#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Validate the independent Auto-AI recovery branch and complete the Emergent-removal merge gates without modifying main."
backend:
  - task: "Independent provider gateway"
    implemented: true
    working: true
    file: "backend/llm_provider.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Current recovery branch uses direct Anthropic, OpenAI and Gemini HTTP APIs; provider adapter tests passed in the latest successful CI run."
  - task: "Direct Stripe adapter"
    implemented: true
    working: true
    file: "backend/stripe_provider.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Direct Stripe REST adapter and local webhook signature verification are implemented. Iteration-5 historical test identified the former checkout-status failure; current recovery code catches upstream lookup failures and returns the known DB state instead of 500."
  - task: "Authentication and protected customer endpoints"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Current server uses bearer session tokens, hashed token storage, authenticated booking access and admin-gated endpoints. Historical iteration-4 authorization findings are addressed in the current code."
  - task: "Independent deployment configuration"
    implemented: true
    working: "NA"
    file: "docs/INDEPENDENT_DEPLOYMENT.md"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Configuration requirements are documented, but production environment variables and authenticated backend runtime have not been independently verified from the available integrations."
frontend:
  - task: "Production frontend build"
    implemented: true
    working: true
    file: "frontend/package.json"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Latest successful recovery CI completed frontend dependency installation and production build; latest Vercel recovery deployment is READY."
  - task: "Independent Capacitor packaging configuration"
    implemented: true
    working: "NA"
    file: "frontend/capacitor.config.json"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Current config uses bundled webDir=build and has no hosted preview server URL. Native Android/iOS packaging has not been built in this audit."
metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Wait for latest recovery CI run 22 to complete after the strengthened independence scan."
    - "Run/confirm authenticated backend smoke tests for AI, auth, bookings and Stripe against the configured staging backend."
    - "Verify production environment variables independently of the retired integration layer."
    - "Review current Vercel preview and backend deployment configuration before marking PR 5 ready."
  stuck_tasks:
    - "Authenticated backend runtime smoke tests cannot yet be confirmed because the backend deployment URL and production/staging environment access are not exposed through the currently available connectors."
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Recovery branch audit continued. Removed active Emergent project files/configuration in prior work; cleaned README and PRD; added independent deployment/runtime smoke-test documentation; strengthened CI to scan project docs/memory for retired integration references while excluding only historical generated test_reports. Main remains untouched."
