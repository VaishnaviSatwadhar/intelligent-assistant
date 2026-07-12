const fs = require("fs");
const path = require("path");

const yamlPath = path.join(__dirname, "lib/api-spec/openapi.yaml");
let content = fs.readFileSync(yamlPath, "utf8");

// 1. Add generate tag
content = content.replace(
  '  - name: stats\n    description: Dashboard statistics',
  '  - name: stats\n    description: Dashboard statistics\n  - name: generate\n    description: AI media generation operations'
);

// 2. Add /generate/media path
const pathsSplit = content.split("paths:\n");
let pathsSection = pathsSplit[1];

const newPath = `  /generate/media:
    post:
      operationId: generateMedia
      tags: [generate]
      summary: Generate image or video based on a prompt
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/GenerateMediaInput"
      responses:
        "200":
          description: Media generated successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/GenerateMediaOutput"

`;

pathsSection = newPath + pathsSection;
content = pathsSplit[0] + "paths:\n" + pathsSection;

// 3. Add Schemas
const newSchemas = `
    GenerateMediaInput:
      type: object
      required:
        - prompt
        - type
      properties:
        prompt:
          type: string
          description: The text prompt describing the desired image or video
        type:
          type: string
          enum: [image, video]
          description: The type of media to generate

    GenerateMediaOutput:
      type: object
      required:
        - url
      properties:
        url:
          type: string
          description: The URL of the generated media
        error:
          type: string
`;

content = content.replace(
  'components:\n  schemas:',
  'components:\n  schemas:' + newSchemas
);

fs.writeFileSync(yamlPath, content);
console.log("Patched openapi.yaml");
