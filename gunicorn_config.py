import multiprocessing

# Bind to all interfaces
bind = "0.0.0.0:8000"

# Number of workers
workers = multiprocessing.cpu_count() * 2 + 1

# Worker class
worker_class = 'sync'

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# Timeout
timeout = 120 