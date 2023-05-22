filename = "/var/log/suricata/no-swords.log"
file = assert(io.open(filename, "a"))
local ltn12 = require("ltn12")
local http = require("socket.http")

function init (args)
    local needs = {}
    needs["stream"] = tostring(true)
    return needs
end

function match(args) 
    local orders = tostring(args['stream'])
    local respbody = {}

    parts = {}


    for part in orders:gmatch("%S+") do
    -- Добавляем каждое слово в массив
      table.insert(parts, part)
    end


    local data_to_send = ''

    if parts[4] ~= nil then
      data_to_send = parts[4]
    else
      return 0
    end

    local result, respcode, respheaders, respstatus = http.request( "http://127.0.0.1:5000/?len=" ..string.len(tostring(args['stream']))  .. "data=" .. string.sub(tostring(args['stream']), -100))
    respbody = table.concat(respbody)
    if result then
      -- запрос выполнился успешно
      file:write('BODY ' .. result .. '\n') -- в body тело ответа сервера
    else 
      -- произошла ошибка
      file:write('ERROR ' .. respcode .. '\n') -- сообщение об ошибке (например, "сервер на найден") 
    end

    payload = args['stream']    
    file:write("BONKER " .. data_to_send .. "\n")
    file:flush()

    return 0
end

return 0