-- ============================================================================
-- Orthanc DICOM Server Lua Script: Auto-Forward DICOM Instances to Laravel API
-- ============================================================================

function OnStoredInstance(instanceId, tags, metadata, origin)
    -- Prevent potential infinite loops if instance originates from Lua
    if origin and origin['RequestOrigin'] == 'Lua' then
        return
    end

    -- Extract DICOM tags with safe fallbacks
    local patientName = tags['PatientName'] or ''
    local patientID   = tags['PatientID'] or ''
    local studyDate   = tags['StudyDate'] or ''

    -- Retrieve raw DICOM binary file content using Orthanc's REST API
    local statusFile, dicomContent = pcall(function()
        return RestApiGet('/instances/' .. instanceId .. '/file')
    end)

    if not statusFile or not dicomContent then
        print('[ERROR] Failed to retrieve DICOM file content for instanceId: ' .. tostring(instanceId))
        return
    end

    -- Configurable Laravel API URL endpoint
    local targetUrl = 'http://127.0.0.1:8000/api/scans'

    -- Construct multipart/form-data body payload
    local boundary = "----OrthancBoundary" .. tostring(os.time())
    local body = ""

    -- 1. Field: patient_id
    body = body .. "--" .. boundary .. "\r\n"
    body = body .. 'Content-Disposition: form-data; name="patient_id"\r\n\r\n'
    body = body .. patientID .. "\r\n"

    -- 2. Field: patient_name
    body = body .. "--" .. boundary .. "\r\n"
    body = body .. 'Content-Disposition: form-data; name="patient_name"\r\n\r\n'
    body = body .. patientName .. "\r\n"

    -- 3. Field: study_date
    body = body .. "--" .. boundary .. "\r\n"
    body = body .. 'Content-Disposition: form-data; name="study_date"\r\n\r\n'
    body = body .. studyDate .. "\r\n"

    -- 4. File Attachment: dicom_file
    local filename = instanceId .. ".dcm"
    body = body .. "--" .. boundary .. "\r\n"
    body = body .. 'Content-Disposition: form-data; name="dicom_file"; filename="' .. filename .. '"\r\n'
    body = body .. 'Content-Type: application/dicom\r\n\r\n'
    body = body .. dicomContent .. "\r\n"

    -- Closing boundary
    body = body .. "--" .. boundary .. "--\r\n"

    -- Define request headers
    local headers = {
        ['Content-Type'] = 'multipart/form-data; boundary=' .. boundary,
        ['Accept']       = 'application/json'
    }

    -- Execute HTTP POST request using Orthanc's HttpPost
    local statusPost, response = pcall(function()
        return HttpPost(targetUrl, body, headers)
    end)

    -- Log response status or failure
    if statusPost and response then
        print('[SUCCESS] Successfully forwarded DICOM instance ' .. instanceId .. ' to Laravel API.')
    else
        print('[ERROR] Failed to send DICOM instance ' .. instanceId .. ' to ' .. targetUrl .. '. Details: ' .. tostring(response))
    end
end
