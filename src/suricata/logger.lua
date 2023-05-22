function init (args)
    local needs = {}
    needs["type"] = "streaming"
    needs["filter"] = "tcp"
    return needs
end

function setup (args)
    filename = SCLogPath() .. "/logger_lua.log"
    file = assert(io.open(filename, "a"))
    SCLogInfo("HTTP Log Filename " .. filename)
    http = 0
end

function log(args)
    http_uri = HttpGetRequestUriRaw()
    if http_uri == nil then
        http_uri = "<unknown>"
    end
    http_uri = string.gsub(http_uri, "%c", ".")

    http_host = HttpGetRequestHost()
    if http_host == nil then
        http_host = "<hostname unknown>"
    end
    http_host = string.gsub(http_host, "%c", ".")

    http_ua = HttpGetRequestHeader("User-Agent")
    if http_ua == nil then
        http_ua = "<useragent unknown>"
    end
    http_ua = string.gsub(http_ua, "%g", ".")
    ip_version, src_ip, dst_ip, protocol, src_port, dst_port = SCFlowTuple()

    if dst_port ~= 4222 then
        return 0
    end

    p = SCStreamingBuffer()
    -- timestring = SCPacketTimeString()
    -- p = SCPacketPayload()
    parts = {}
   
    for part in p:gmatch("%S+") do
    -- Добавляем каждое слово в массив
      table.insert(parts, part)
    end

    for i, part in ipairs(parts) do
      if string.len(part) > 200 then
        file:write(string.sub(part, 0, 100) .. " ..:" .. string.len(part) .. ":.. " .. string.sub(part, -100) .. "\n")
      else
        file:write(part .. "\n")
      end
    end

    -- file:write (http_host .. " [**] " .. http_uri .. " [**] " ..
       --    http_ua .. " [**] " .. src_ip .. ":" .. src_port .. " -> " ..
         --  dst_ip .. ":" .. dst_port .. ":" .. p .. "\n")
    file:flush()

    http = http + 1
end

function deinit (args)
    SCLogInfo ("HTTP transactions logged: " .. http);
    file:close(file)
end