const axios = require("axios");
const fs = require("fs");
const path = require("path");

const n8nHost = "http://34.93.127.198:5678"; // Replace with your n8n host
const apiKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNTFkZTc1Ni02ODg1LTQ4NjYtOTk1Ni02NTI3YzIzNTExNmMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzUwNDA0NTk4fQ.EYWma5NeCmMjjzIJgDYzPGtN1VC50QxgirR7MNNNfDs";

// Fetch the list of workflows with pagination support
async function getWorkflows() {
  let workflows = [];
  let nextCursor = null;

  do {
    try {
      const response = await axios.get(`${n8nHost}/api/v1/workflows`, {
        headers: {
          "X-N8N-API-KEY": apiKey, // Use X-N8N-API-KEY for authentication
        },
        params: {
          cursor: nextCursor, // Pass the nextCursor to fetch the next page if available
        },
      });

      // Append the workflows from this page to the full list
      workflows = workflows.concat(response.data.data);

      // Get the nextCursor to fetch the next page (if exists)
      nextCursor = response.data.nextCursor;
    } catch (error) {
      console.error(
        "Error fetching workflows:",
        error.response ? error.response.data : error.message
      );
    }
  } while (nextCursor); // Continue fetching until no nextCursor is found

  return workflows;
}

// Export workflows
async function exportWorkflows() {
  const workflows = await getWorkflows();

  if (!Array.isArray(workflows)) {
    console.error(
      "Error: The workflows data is not iterable. Ensure the API call was successful."
    );
    return;
  }

  // Define the backup directory path
  const backupDirectory = path.join(__dirname, "backup:v3");

  // Check if the directory exists, and create it if it doesn't
  if (!fs.existsSync(backupDirectory)) {
    fs.mkdirSync(backupDirectory, { recursive: true });
    console.log(`Created directory: ${backupDirectory}`);
  }

  for (const workflow of workflows) {
    try {
      // Fetch the workflow details using the workflow ID
      const response = await axios.get(
        `${n8nHost}/api/v1/workflows/${workflow.id}`,
        {
          headers: {
            "X-N8N-API-KEY": apiKey, // Use X-N8N-API-KEY for authentication
          },
        }
      );

      // Sanitize the workflow name to create a safe filename
      const sanitizedWorkflowName = workflow.name.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = path.join(
        backupDirectory, // Save in the 'n8n_workflows' folder
        `backup_${sanitizedWorkflowName}_${workflow.id}.json`
      );

      // Check if the file already exists, skip if it does
      if (fs.existsSync(fileName)) {
        console.log(`Workflow file already exists, skipping: ${fileName}`);
        continue; // Skip exporting this workflow if file exists
      }

      // Save the workflow as a .json file in the backup directory
      fs.writeFileSync(fileName, JSON.stringify(response.data, null, 2));
      console.log(`Exported workflow: ${fileName}`);
    } catch (error) {
      console.error(
        `Error exporting workflow ${workflow.id}:`,
        error.response ? error.response.data : error.message
      );
    }
  }

  // Function to count the workflows
  async function getWorkflowCount() {
    console.log(`Total workflows exported: ${workflows.length}`);
  }

  // Call the function to get and display the total number of workflows
  getWorkflowCount();
}

// Call the export function to export workflows
exportWorkflows();
