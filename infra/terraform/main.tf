terraform {
  required_version = ">= 1.6.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.40"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

variable "do_token" {
  type      = string
  sensitive = true
}

resource "digitalocean_vpc" "axios_pay" {
  name     = "axios-pay-vpc"
  region   = "lon1"
  ip_range = "10.20.0.0/16"
}

resource "digitalocean_kubernetes_cluster" "axios_pay" {
  name     = "axios-pay-doks"
  region   = "lon1"
  version  = "1.31.1-do.4"
  vpc_uuid = digitalocean_vpc.axios_pay.id

  node_pool {
    name       = "default-pool"
    size       = "s-2vcpu-4gb"
    node_count = 2
    auto_scale = true
    min_nodes  = 2
    max_nodes  = 10
  }
}

resource "digitalocean_database_cluster" "postgres" {
  name       = "axios-pay-postgres"
  engine     = "pg"
  version    = "15"
  size       = "db-s-1vcpu-2gb"
  region     = "lon1"
  node_count = 1
}

resource "digitalocean_database_cluster" "redis" {
  name       = "axios-pay-redis"
  engine     = "redis"
  version    = "7"
  size       = "db-s-1vcpu-2gb"
  region     = "lon1"
  node_count = 1
}

resource "digitalocean_spaces_bucket" "uploads" {
  name   = "axios-pay-uploads"
  region = "lon1"
}

resource "digitalocean_domain" "axiospay" {
  name = "axiospay.africa"
}
