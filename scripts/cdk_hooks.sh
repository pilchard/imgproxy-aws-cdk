#!/bin/env zsh
# see: https://stackoverflow.com/a/64449787
(
    PHASE=$1
    case "$PHASE" in
    pre)
        local NAME="IMGPROXY_SSM_TEST"
        local VALUE="\$secures&tringtestvalude"

        aws ssm put-parameter \
            --name "/imgproxy/testing/$NAME" \
            --value "$VALUE" \
            --type "SecureString" \
            --tier "Standard"
        ;;

    post)
        # Load stack environment variables
        set -a
        # shellcheck disable=SC1091
        . ./.env
        set +a

        # modified from https://gist.github.com/mihow/9c7f559807069a03e302605691f85572
        local ENV_FILE="./.ssm.env"

        # Check if the .env file exists
        if [ -f "$ENV_FILE" ]; then

            echo "[INFO]: Reading $ENV_FILE file."
            echo "[INFO]: SYSTEMS_MANAGER_PARAMETERS_PATH -> \`$SYSTEMS_MANAGER_PARAMETERS_PATH\`"

            # Read the .env file line by line
            while IFS= read -r line; do
                # Skip comments and empty lines
                if [[ "$line" =~ ^\s*#.*$ || -z "$line" ]]; then
                    continue
                fi

                # Split the line into key and value. Trim whitespace on either side.
                key=$(echo "$line" | cut -d '=' -f 1 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
                value=$(echo "$line" | cut -d '=' -f 2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

                # Remove single quotes, double quotes, and leading/trailing spaces from the value
                # value=$(echo "$value" | sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//' -e 's/^[[:space:]]*//;s/[[:space:]]*$//')

                # Export the key and value as environment variables
                echo "$key=$value"
                # export "$key=$value"

            done <"$ENV_FILE"
            echo "[DONE]: Reading $ENV_FILE file."
        else
            echo "[ERROR]: $ENV_FILE not found."
        fi

        ;;

    *)
        echo "Please provide a valid cdk_hooks phase"
        exit 64
        ;;

    esac
)

# see: https://yshen4.github.io/infrastructure/AWS/CDK_context.html
# #!/usr/bin/env bash
# if [[ $# -ge 2 ]]; then
#     export CDK_DEPLOY_ACCOUNT=$1
#     export CDK_DEPLOY_REGION=$2
#     # skip parameter 1 and 2
#     shift; shift
#     npx cdk deploy "$@"
#     exit $?
# else
#     echo 1>&2 "Provide AWS account and region as first two args."
#     echo 1>&2 "Addiitonal args are passed through to cdk deploy."
#     exit 1
# fi
