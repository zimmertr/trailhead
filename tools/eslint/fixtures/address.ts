type Request = { ip: string; socket: { remoteAddress: string } }
export const who = (request: Request): string => request.ip + request.socket.remoteAddress
