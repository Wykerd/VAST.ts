import winston from "winston";

export function consoleLogFormat() {
    return winston.format.printf(log => {
        if (log.node)
            return `${log.level}: [${log.node}] ${log.message}`;
        if (log.fromNode) 
            return `${log.level}: [${log.fromNode} -> ${log.toNode ?? 'unidentified'}] ${log.message}`;
        return `${log.level}: ${log.message}`;
    })
}

export function createConsoleTransport() {
    return new winston.transports.Console({
        format: winston.format.printf(log => {
            if (log.node)
                return `${log.level}: [${log.node}] ${log.message}`;
            if (log.fromNode) 
                return `${log.level}: [${log.fromNode} -> ${log.toNode ?? 'unidentified'}] ${log.message}`;
            return `${log.level}: ${log.message}`;
        })
    })
}

export function createConsoleLogger() {
    return winston.createLogger({
        transports: [
            createConsoleTransport(),
        ]
    })
}

export function createFileLogger(filename: string) {
    return winston.createLogger({
        transports: [
            new winston.transports.File({ filename }),
        ]
    })
}
