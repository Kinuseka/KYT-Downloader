$(document).ready(function() {
    $("form").submit(function(event) {
        event.preventDefault(); // Prevent the form from submitting normally
        // Get the input value
        var link = $("#link").val();
        // Create an AJAX request
        if ((/(www\.)?youtube\.com|youtu\.be/).test(link)) {
            $(".Forms").text("Fetching details...")
            $(".redirect a").hide();
            $.ajax({
                url: "/fetch_video", // Replace with your server URL
                type: "POST", // or "GET" depending on your server
                data: { videoid: link },
                success: function(response) {
                    // Handle the response from the server
                    $(".Forms").html(response)
                    $(".redirect a").attr('href', '/video').text("<- Retry").show();
                },
                error: function(xhr, status, error) {
                    // Handle errors
                    console.log(xhr.responseJSON.code)
                    try{
                        $(".Forms").text(xhr.responseJSON.code)
                    } catch (e){
                        $(".Forms").text("A server side error occured, report this to support@kinuseka.us")
                    }
                    $(".redirect a").attr('href', '/video').text("<- Retry").show();
                }
            });
        } else {
            PopError("Invalid link");
            $(".redirect a").attr('href', '/video').text("<- Retry").show();
            return;
        }
    });
});

function PopError(msg) {
    $(".error_msg").text(msg)
}
