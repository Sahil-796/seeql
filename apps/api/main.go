package main

import (
	"github.com/Sahil-796/seeql/apps/api/routes"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	routes.Setup(r)
	r.Run(":8080")
}
