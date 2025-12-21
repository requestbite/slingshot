import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Label } from '../common/Label';
import { Select } from '../common/Select';
import { TextInput } from '../common/TextInput';

/**
 * OpenAPIServerSelectModal
 *
 * Allows users to select from multiple OpenAPI server URLs and configure
 * server variables when importing OpenAPI specifications.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Array} servers - Array of server objects from OpenAPI spec
 * @param {Function} onClose - Callback when modal is closed/cancelled
 * @param {Function} onConfirm - Callback when user confirms selection (serverIndex, variableValues)
 */
export function OpenAPIServerSelectModal({ isOpen, servers = [], onClose, onConfirm }) {
  const [selectedServerIndex, setSelectedServerIndex] = useState('');
  const [variableValues, setVariableValues] = useState({});
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [editableUrl, setEditableUrl] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && servers.length > 0) {
      setSelectedServerIndex('');
      setVariableValues({});
      setResolvedUrl('');
      setEditableUrl('');
    }
  }, [isOpen, servers]);

  // Get currently selected server
  const selectedServer = selectedServerIndex !== '' ? servers[parseInt(selectedServerIndex)] : null;

  // Update resolved URL whenever selection changes
  useEffect(() => {
    if (selectedServer) {
      const resolved = resolveServerUrl(selectedServer.url, variableValues, selectedServer.variables || {});
      setResolvedUrl(resolved);
    } else {
      setResolvedUrl('');
    }
  }, [selectedServerIndex, variableValues, selectedServer]);

  // Sync editable URL with resolved URL
  useEffect(() => {
    setEditableUrl(resolvedUrl);
  }, [resolvedUrl]);

  // When server selection changes, reset variable values and initialize with defaults
  useEffect(() => {
    if (selectedServer && selectedServer.variables) {
      const initialValues = {};
      for (const [varName, varDef] of Object.entries(selectedServer.variables)) {
        // Use default value if available, otherwise first enum value, otherwise empty
        if (varDef.default) {
          initialValues[varName] = varDef.default;
        } else if (varDef.enum && varDef.enum.length > 0) {
          initialValues[varName] = varDef.enum[0];
        } else {
          initialValues[varName] = '';
        }
      }
      setVariableValues(initialValues);
    } else {
      setVariableValues({});
    }
  }, [selectedServerIndex]);

  // Check if all required selections are made
  const isFormValid = () => {
    if (selectedServerIndex === '') return false;

    // If selected server has variables, all must be selected
    if (selectedServer && selectedServer.variables) {
      for (const varName of Object.keys(selectedServer.variables)) {
        if (!variableValues[varName]) {
          return false;
        }
      }
    }

    // Validate that editableUrl is a valid URL
    if (!editableUrl) return false;

    try {
      new URL(editableUrl);
      return true;
    } catch {
      return false;
    }
  };

  const handleServerChange = (value) => {
    setSelectedServerIndex(value);
  };

  const handleVariableChange = (varName, value) => {
    setVariableValues({
      ...variableValues,
      [varName]: value
    });
  };

  const handleUrlChange = (e) => {
    setEditableUrl(e.target.value);
  };

  const handleConfirm = () => {
    if (isFormValid()) {
      onConfirm({
        serverIndex: parseInt(selectedServerIndex),
        variableValues: variableValues,
        resolvedUrl: editableUrl
      });
    }
  };

  const handleCancel = () => {
    onClose();
  };

  // Generate server options for dropdown
  const serverOptions = servers.map((server, index) => ({
    value: String(index),
    label: server.description || server.url
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="API Server URLs"
      size="md"
    >
      <div class="text-sm text-gray-500 mb-6">
        Please select the base URL for the API that you want to use.
      </div>

      <div class="space-y-4">
        {/* Server URL Selection */}
        <div>
          <Label htmlFor="server-url" mandatory>
            URL
          </Label>
          <Select
            id="server-url"
            value={selectedServerIndex}
            onChange={handleServerChange}
            options={serverOptions}
            placeholder="Select a server URL"
          />
        </div>

        {/* Variable Selection - shown only if selected server has variables */}
        {selectedServer && selectedServer.variables && (
          <div class="space-y-4 pt-2">
            {Object.entries(selectedServer.variables).map(([varName, varDef]) => {
              const variableOptions = (varDef.enum || []).map(enumValue => ({
                value: enumValue,
                label: enumValue
              }));

              return (
                <div key={varName}>
                  <Label htmlFor={`var-${varName}`} mandatory>
                    {varName}
                  </Label>
                  {varDef.description && (
                    <div class="text-xs text-gray-500 mb-1.5">
                      {varDef.description}
                    </div>
                  )}
                  <Select
                    id={`var-${varName}`}
                    value={variableValues[varName] || ''}
                    onChange={(value) => handleVariableChange(varName, value)}
                    options={variableOptions}
                    placeholder={`Select ${varName}...`}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Resolved URL Input */}
        {editableUrl && (
          <div class="pt-4 border-t border-gray-200">
            <Label htmlFor="resolved-url">
              Resolved URL
            </Label>
            <TextInput
              id="resolved-url"
              type="text"
              value={editableUrl}
              onChange={handleUrlChange}
              placeholder="https://api.example.com"
              description="This URL will be used for the baseUrl collection variable."
            />
          </div>
        )}

        {/* Action Buttons */}
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse pt-4">
          <Button
            type="button"
            variant="primary"
            disabled={!isFormValid()}
            onClick={handleConfirm}
            className="w-full sm:ml-3 sm:w-auto"
          >
            Import
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            className="mt-3 w-full sm:mt-0 sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Resolves a server URL by substituting variables
 * @param {string} urlTemplate - URL template with {variable} placeholders
 * @param {Object} variableValues - Map of variable names to their selected values
 * @param {Object} variableDefinitions - Variable definitions from OpenAPI spec
 * @returns {string} Resolved URL
 */
function resolveServerUrl(urlTemplate, variableValues, variableDefinitions) {
  let resolved = urlTemplate;

  // Replace all {variableName} with their values
  for (const [varName, value] of Object.entries(variableValues)) {
    if (value) {
      resolved = resolved.replace(new RegExp(`\\{${varName}\\}`, 'g'), value);
    }
  }

  // If there are still unreplaced variables, show them with defaults or as-is
  for (const [varName, varDef] of Object.entries(variableDefinitions)) {
    const placeholder = `{${varName}}`;
    if (resolved.includes(placeholder)) {
      const defaultValue = varDef.default || (varDef.enum && varDef.enum[0]) || '';
      if (defaultValue) {
        resolved = resolved.replace(new RegExp(`\\{${varName}\\}`, 'g'), defaultValue);
      }
    }
  }

  return resolved;
}
