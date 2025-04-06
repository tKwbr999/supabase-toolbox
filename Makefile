# Makefile for supabase-toolbox project root

# Define the path to the health-check function
HEALTH_CHECK_DIR = supabase/functions/hc

# Target to build the health-check function (verbose)
# This command changes to the HEALTH_CHECK_DIR and runs make there.
build-health-check-verbose:
	@echo "Building health-check function via $(HEALTH_CHECK_DIR)/Makefile (verbose)..."
	$(MAKE) -C $(HEALTH_CHECK_DIR) build
	@echo "Finished building health-check function."

# Target to serve the health-check function locally
# Depends on the build target to ensure the function is built first.
# Uses Supabase CLI to serve the specific function 'hc'.
# Assumes .env file in the root is automatically picked up by Supabase CLI.
serve-hc: build-health-check-verbose
	@echo "Serving health-check function locally..."
	supabase functions serve hc --no-verify-jwt
	# Add --env-file .env if needed, but Supabase CLI usually finds it.

.PHONY: build-health-check-verbose serve-hc
