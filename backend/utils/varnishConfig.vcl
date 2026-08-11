vcl 4.0;

backend default {
    .host = "127.0.0.1";
    .port = "5000";
}

sub vcl_recv {
    # Bypass caching for user profiles and private wallet views
    if (req.url ~ "/api/v1/user/" || req.url ~ "/api/v1/wallet") {
        return (pass);
    }
    
    # Cache public market price inquiries
    if (req.url ~ "/api/v1/market-rates") {
        return (hash);
    }
}

sub vcl_backend_response {
    # Set default cache duration to 1 hour for public lists
    if (bereq.url ~ "/api/v1/market-rates") {
        set beresp.ttl = 3600s;
    }
}
