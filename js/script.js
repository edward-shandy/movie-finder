function searchMovies(){
    $.ajax ({
        url: 'https://www.omdbapi.com',
        type: 'get',
        dataType: 'json',
        data: {
            'apikey' : '7bc4e295',
            's' : $('#search-input').val()
        },
        success: function(result){
            console.log('result:',result);
            if (result.Response == "True"){
                $('#list-movie').html('');
                
                let movies = result.Search;
                console.log('movies:',movies);
                $.each(movies, function(i, data){
                    $('#list-movie').append(`
                        <div class="col-md-3">
                            <div class="card mb-3">
                                <img src="`+ data.Poster +`" class="card-img-top" alt="...">
                                <div class="card-body">
                                    <h5 class="card-title">`+ data.Title +`</h5>
                                    <h6 class="card-subtitle mb-2 text-body-secondary">`+ data.Year +`</h6>
                                    <a href="#" class="btn btn-primary see-details" data-bs-toggle="modal" data-bs-target="#movieModal" data-id="`+ data.imdbID +`">See details</a>
                                </div>
                            </div>
                        </div>
                    `);
                }); 
            } else{
                console.log('Response:', result.Response);
                console.log('Error:', result.Error);
                $('#list-movie').html(`
                    <h1 class="text-center">` +result.Error+ `</h1>
                `);
            };


            $('#search-input').val('');
        }
    });
}

$('#search-button').on('click', function () {
    searchMovies();
});

$('#search-input').keypress(function(e){
    if(e.keyCode === 13){
        searchMovies();
    }
});

$('#list-movie').on('click', '.see-details', function(){
    console.log($(this).data('id'));
    $.ajax ({
        url: 'https://www.omdbapi.com',
        dataType: 'json',
        type: 'get',
        data: {
            'apiKey': '7bc4e295',
            'i': $(this).data('id')
        },

        success: function(movie){
            if (movie.Response === 'True'){
                $('.modal-body').html(`
                    <div class="container-fluids"> 
                        <div class="row"> 
                            <div class="col-md-4"> 
                                <img src="`+ movie.Poster +`" class="img-fluid"> 
                            </div>
                            <div class="col-md-8"> 
                                <ul class="list-group">
                                    <li class="list-group-item">`+ movie.Plot +`</li>
                                    <li class="list-group-item">Released : `+ movie.Released +`</li>
                                    <li class="list-group-item">Genre : `+ movie.Genre +`</li>
                                    <li class="list-group-item">Actors : `+ movie.Actors +`</li>
                                    <li class="list-group-item">Runtime : `+ movie.Runtime +`</li>
                                    <li class="list-group-item">Rating : `+ movie.imdbRating +`</li>

                                </ul>
                            </div>
                        
                        </div>
                    </div>
                `)
                $('#exampleModalLabel').html(`
                    <h3>`+ movie.Title +`</h3>
                `)
            }
        }
    })
})