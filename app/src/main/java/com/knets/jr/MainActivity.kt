package com.knets.jr

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Simple layout with basic functionality
        setContentView(android.R.layout.activity_list_item)
        
        Toast.makeText(this, "Knets Jr - Device Management App", Toast.LENGTH_LONG).show()
    }
}